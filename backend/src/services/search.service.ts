import axios from 'axios';
import { SearchSource } from '../types/index';

// ── Serpstack (fast, organic results) ────────────────────
export async function searchWithSerpstack(query: string, count: number = 3): Promise<SearchSource[]> {
  try {
    const response = await axios.get('http://api.serpstack.com/search', {
      params: { 
        access_key: process.env.SERPSTACK_API_KEY, 
        query: query, 
        num: count 
      },
      timeout: 8000,
    });

    const results = response.data?.organic_results || [];

    return results.slice(0, count).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.snippet || '',
    }));
  } catch (error) {
    console.error('Serpstack Search error:', error);
    return [];
  }
}

// ── SerpApi (rich: shopping, local, scholar, knowledge) ──
export async function searchWithSerpApi(query: string, count: number = 3, type: string = 'search'): Promise<SearchSource[]> {
  try {
    const response = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: query,
        api_key: process.env.SERPAPI_API_KEY,
        num: count,
        engine: 'google',
        tbm: type === 'search' ? undefined : type
      },
      timeout: 8000,
    });

    const data = response.data;
    let rawResults = data.organic_results || data.shopping_results || data.local_results?.places || [];
    
    // Knowledge graph parsing fallback
    if (rawResults.length === 0 && data.knowledge_graph) {
      rawResults = [{
        title: data.knowledge_graph.title || 'Knowledge Graph Fact',
        link: data.knowledge_graph.description_source || data.knowledge_graph.description_link || '',
        snippet: data.knowledge_graph.description || JSON.stringify(data.knowledge_graph),
      }];
    }

    return rawResults.slice(0, count).map((r: any) => ({
      title: r.title || r.name || 'Untitled Result',
      url: r.link || r.url || r.links?.website || '',
      description: r.snippet || r.price || r.rating ? `Rating: ${r.rating}` : '',
    }));
  } catch (error) {
    console.error('SerpApi Search error:', error);
    return [];
  }
}

// ── Smart router ──────────────────────────────────────────
export async function smartSearch(query: string, count: number = 3): Promise<{ sources: SearchSource[]; contextString: string }> {
  const q = query.toLowerCase();

  const useSerpApi = [
    'buy', 'price', 'shop', 'review',                // shopping
    'near me', 'location', 'open now', 'address',    // local
    'research', 'paper', 'scholar',                  // academic
    'who is', 'born', 'founded', 'what is the'       // knowledge graph
  ].some(p => q.includes(p));

  console.log(`[Smart Search] Routing "${query}" to ${useSerpApi ? 'SerpApi' : 'Serpstack'}...`);

  // Try the preferred API
  let sources = useSerpApi 
    ? await searchWithSerpApi(query, count)
    : await searchWithSerpstack(query, count);

  // Fallback: If SerpApi fails or returns nothing, fallback to Serpstack seamlessly
  if (useSerpApi && sources.length === 0) {
    console.warn('[Smart Search] SerpApi returned empty, falling back to Serpstack...');
    sources = await searchWithSerpstack(query, count);
  }

  const contextString = sources
    .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.description}`)
    .join('\n\n');

  return { sources, contextString };
}
