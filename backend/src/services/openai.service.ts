import OpenAI from 'openai';
import { ChatMessage } from '../types/index';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

import { SYSTEM_PROMPTS, detectPromptType } from '../utils/prompts';
import { CLAUDE_STYLE_FULL } from '../utils/claude-style';
import { CHAT_FORMAT_PROMPT } from '../utils/chat-format-prompt';
import { agentTools, executeTool } from './tools.service';

// ─── Streaming Chat Completion ─────────────────────────────────────────────
export const streamChatCompletion = async (
  messages: ChatMessage[],
  model: string,
  searchContext: string,
  onToken: (token: string) => void,
  onComplete: (fullText: string) => void,
  customPrompt?: string | null
): Promise<void> => {

  // Detect the best prompt based on the user's latest message
  const lastMsg = messages.at(-1)?.content || '';
  const promptType = detectPromptType(lastMsg);
  
  // Combine Claude's personality with the specific domain instructions (or User's Custom Persona)
  const domainPrompt = customPrompt || SYSTEM_PROMPTS[promptType];
  let systemContent = [CHAT_FORMAT_PROMPT, CLAUDE_STYLE_FULL, domainPrompt].join('\n\n---\n\n');



  if (searchContext) {
    systemContent += `\n\n--- Web Search Results ---\n${searchContext}\n\nUse these results to answer accurately. Cite URLs when relevant.`;
  }

  const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role as any, content: m.content })),
  ];

  let isToolCall = false;
  let toolArgs = "";
  let toolName = "";
  let toolCallId = "";

  const stream = await openai.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
    messages: fullMessages,
    stream: true,
    tools: agentTools as any,
    max_tokens: 2000,
    temperature: 0.7,
  });

  let fullText = '';

  for await (const chunk of stream) {
    if (chunk.choices[0]?.delta?.tool_calls) {
       const tc = chunk.choices[0].delta.tool_calls[0];
       if (tc.id) toolCallId = tc.id;
       if (tc.function?.name) toolName = tc.function.name;
       if (tc.function?.arguments) toolArgs += tc.function.arguments;
       isToolCall = true;
    }
    
    const token = chunk.choices[0]?.delta?.content || '';
    if (token && !isToolCall) {
      fullText += token;
      onToken(token);
    }
  }

  if (isToolCall) {
    fullMessages.push({
       role: 'assistant',
       content: null,
       tool_calls: [{ id: toolCallId, type: 'function', function: { name: toolName, arguments: toolArgs } }]
    });
    
    // Execute the tool and show user what's happening in italicized thought process
    const toolResult = await executeTool(toolName, toolArgs, (updateStr) => {
       fullText += updateStr;
       onToken(updateStr);
    });

    fullMessages.push({
       role: 'tool',
       tool_call_id: toolCallId,
       content: toolResult
    });

    // Recursively call standard openAI to fetch the final answer based on the tool result!
    const followupStream = await openai.chat.completions.create({
      model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: fullMessages,
      stream: true,
      max_tokens: 2000,
    });

    for await (const chunk of followupStream) {
      const token = chunk.choices[0]?.delta?.content || '';
      if (token) {
        fullText += token;
        onToken(token);
      }
    }
  }

  onComplete(fullText);
};



// ─── Auto-generate chat title from first message ───────────────────────────
export const generateChatTitle = async (userMessage: string): Promise<string> => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'user',
        content: `Generate a short, descriptive title (max 6 words) for a chat that starts with this message. Reply with ONLY the title, no quotes:\n\n"${userMessage}"`,
      },
    ],
    max_tokens: 20,
    temperature: 0.5,
  });

  return response.choices[0].message.content?.trim() || 'New Chat';
};
