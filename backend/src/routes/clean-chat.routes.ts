import express from 'express';
import OpenAI from 'openai';
import { SYSTEM_PROMPTS, detectPromptType } from '../utils/prompts';
import { CLAUDE_STYLE_FULL } from '../utils/claude-style';
import { CHAT_FORMAT_PROMPT } from '../utils/chat-format-prompt';
import { smartSearch } from '../services/search.service';
import { extractAndStoreMemories, getUserMemoriesString } from '../services/memory.service';

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post('/', async (req, res) => {
  try {
    const { messages, model, useSearch } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages are required.' });
    }

    const lastMsg = messages.at(-1)?.content || '';
    
    // Background Memory Extraction
    extractAndStoreMemories('default_user', lastMsg);

    const promptType = detectPromptType(lastMsg);
    const domainPrompt = SYSTEM_PROMPTS[promptType];
    
    // Fetch User Memories
    const memoryContext = await getUserMemoriesString('default_user');
    
    let system = [CHAT_FORMAT_PROMPT, CLAUDE_STYLE_FULL, domainPrompt, memoryContext].filter(Boolean).join('\n\n---\n\n');

    const autoSearchKeywords = ['latest', 'new', 'update', 'current', 'today', 'now', '2025', '2026', 'recent', 'news'];
    const shouldAutoSearch = autoSearchKeywords.some(w => lastMsg.toLowerCase().includes(w));
    const finalUseSearch = useSearch || shouldAutoSearch;

    // Trigger Web Search if active
    if (finalUseSearch) {
      const { contextString } = await smartSearch(lastMsg, 3);
      if (contextString) {
        system += `\n\n--- Web Search Results ---\n${contextString}\n\nUse these real-time search results to answer accurately. Cite URLs when relevant.`;
      }
    }

    const formattedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: system },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];

    const response = await openai.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: formattedMessages,
      max_tokens: 1500,
    });

    res.json({ content: response.choices[0]?.message?.content || '' });
  } catch (error) {
    console.error('CleanChat Error:', error);
    res.status(500).json({ error: 'Failed to generate response.' });
  }
});

export default router;
