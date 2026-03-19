import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use local Qdrant by default unless user specified Cloud URL
const qdrantUrl = process.env.QDRANT_URL || 'http://127.0.0.1:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || undefined;

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

const COLLECTION_NAME = 'project_knowledge';

// ── 1. Create Collection (Runs on Startup) ─────────────────
export const ensureQdrantCollection = async () => {
  try {
    const res = await qdrant.getCollections();
    const exists = res.collections.some(c => c.name === COLLECTION_NAME);
    if (!exists) {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: { size: 1536, distance: 'Cosine' },
      });
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' created (1536 dims).`);
    } else {
      console.log(`[Qdrant] Collection '${COLLECTION_NAME}' loaded.`);
    }
  } catch (error: any) {
    console.warn(`[Qdrant] Connection failed to ${qdrantUrl}. Ensure Qdrant is running.`);
  }
};

// ── 2. Chunking & Embeddings ────────────────────────────────
export const chunkText = (text: string, maxTokens: number = 500): string[] => {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    // 1 token ~= 4 chars typically
    if (currentLength + word.length > maxTokens * 4) { 
      chunks.push(currentChunk.join(' '));
      currentChunk = [];
      currentLength = 0;
    }
    currentChunk.push(word);
    currentLength += word.length + 1;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join(' '));
  return chunks;
};

// ── 3. Store Documents ──────────────────────────────────────
export const storeKnowledgeBaseDocument = async (conversationId: string, filename: string, rawText: string) => {
  const chunks = chunkText(rawText);
  if (chunks.length === 0) return 0;

  console.log(`[Qdrant] Embedding ${chunks.length} chunks for doc: ${filename}`);

  // Process Embeddings in batches to avoid OpenAI rate limits
  const embeddingsResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: chunks,
  });

  const points = embeddingsResponse.data.map((item, i) => ({
    id: uuidv4(),
    vector: item.embedding,
    payload: {
      conversationId,
      filename,
      text: chunks[i],
    },
  }));

  await qdrant.upsert(COLLECTION_NAME, {
    wait: true,
    points,
  });

  return chunks.length;
};

// ── 4. Retrieve RAG Context ──────────────────────────────────
export const queryKnowledgeBase = async (conversationId: string, query: string, topK: number = 3): Promise<string> => {
  try {
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });

    const searchResult = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbedding.data[0].embedding,
      limit: topK,
      filter: {
        must: [
          { key: 'conversationId', match: { value: conversationId } }
        ]
      }
    });

    if (!searchResult || searchResult.length === 0) return '';

    const docs = searchResult.map(res => `[Source: ${res.payload?.filename}]\n${res.payload?.text}`).join('\n\n---\n\n');
    return docs;
  } catch (e) {
    console.error('[Qdrant] RAG Query failed:', e);
    return '';
  }
};
