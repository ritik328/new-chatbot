import axios from 'axios';

// ── 1. The Tools Definition (Given to OpenAI) ─────────────────
export const agentTools = [
  {
    type: "function",
    function: {
      name: "execute_code",
      description: "Writes and executes Python or JavaScript code live in a secure sandbox. Use this to run math, scrape data, formatting, or test scripts! Never guess answers if you can execute code to find out.",
      parameters: {
        type: "object",
        properties: {
          language: { type: "string", description: "Either 'python' or 'javascript'" },
          code: { type: "string", description: "The full raw code string to execute" }
        },
        required: ["language", "code"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_webpage",
      description: "Fetches and reads the entire markdown content of any specific web URL. Use this immediately if the user asks you to summarize an article, read documentation, or parse a specific link.",
      parameters: {
        type: "object",
        properties: { url: { type: "string", description: "The full http URL (e.g. https://example.com/blog)" } },
        required: ["url"]
      }
    }
  }
];

// ── 2. The Execution Engine ──────────────────────────────────
export async function executeTool(name: string, argsStr: string, onUpdate: (msg: string) => void): Promise<string> {
  try {
    const args = JSON.parse(argsStr);

    // ── Tool 1: URL Reader
    if (name === 'read_webpage') {
      onUpdate(`\n\n_Reading webpage content from: ${args.url}_...\n\n`);
      try {
        const res = await axios.get(`https://r.jina.ai/${args.url}`, { timeout: 10000 });
        const content = res.data;
        return content ? content.substring(0, 15000) : "Page was empty or unreadable.";
      } catch (e: any) {
        return `Failed to read URL: ${e.message}`;
      }
    }

    // ── Tool 2: Code Execution Sandbox (Piston API)
    if (name === 'execute_code') {
      onUpdate(`\n\n_Executing ${args.language} script in sandbox..._\n\n`);
      try {
        const langMap: Record<string, string> = { python: 'python', javascript: 'javascript', js: 'javascript', py: 'python' };
        
        const res = await axios.post('https://emacs.piston.rs/api/v2/execute', {
          language: langMap[args.language.toLowerCase()] || 'python',
          version: '*', // Uses latest stable version of the requested language natively
          files: [{ content: args.code }]
        });

        // Piston responds with compile output and run output
        const output = res.data.run?.output || res.data.compile?.output || 'Code executed but returned no text output.';
        return typeof output === 'string' ? output.substring(0, 5000) : JSON.stringify(output).substring(0, 5000);
      } catch (e: any) {
        return `Sandbox execution error: ${e.response?.data?.message || e.message}`;
      }
    }

    return `Unknown tool function: ${name}`;
  } catch (error: any) {
    return `Critical tool execution error: ${error.message}`;
  }
}
