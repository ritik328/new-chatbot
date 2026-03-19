import { Request } from 'express';



// ─── Conversation ─────────────────────────────────────────────────────────────
export interface IConversation {
  _id: string;
  title: string;
  model: 'gpt-4o' | 'gpt-4o-mini';
  searchEnabled: boolean;
  folder?: string;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Message ──────────────────────────────────────────────────────────────────
export interface IMessage {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SearchSource[];
  embeddingId?: string;
  tokens?: number;
  reaction?: 'upvote' | 'downvote' | null;
  createdAt: Date;
}

// ─── Brave Search ─────────────────────────────────────────────────────────────
export interface SearchSource {
  title: string;
  url: string;
  description: string;
}

export interface BraveSearchResult {
  web: {
    results: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// ─── Memory ───────────────────────────────────────────────────────────────────
export interface MemoryPayload {
  messageId: string;
  conversationId: string;
  snippet: string;
  role: 'user' | 'assistant';
  timestamp: number;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
