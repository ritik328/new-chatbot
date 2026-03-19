import axios from 'axios';
import { SearchSource } from '../types/index';

// POST /api/search — wraps Serpstack Search API
export const serpstackSearch = async (
  query: string,
  count: number = 5
): Promise<{ sources: SearchSource[]; contextString: string }> => {
  try {
    const response = await axios.get(
      'http://api.serpstack.com/search',
      {
        params: { 
          access_key: process.env.SERPSTACK_API_KEY,
          query: query,
          num: count
        },
        timeout: 8000,
      }
    );

    const results = response.data?.organic_results || [];

    const sources: SearchSource[] = results.slice(0, count).map((r: {
      title: string;
      url: string;
      snippet: string;
    }) => ({
      title: r.title,
      url: r.url,
      description: r.snippet || '',
    }));

    // Format as a string to inject into the OpenAI prompt
    const contextString = sources
      .map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.description}`)
      .join('\n\n');

    return { sources, contextString };

  } catch (error) {
    console.error('Serpstack Search error:', error);
    return { sources: [], contextString: '' };
  }
};
