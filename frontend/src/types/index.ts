export interface SearchSource {
  title: string;
  url: string;
  description: string;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: SearchSource[];
  reaction?: 'upvote' | 'downvote' | null;
  createdAt: string;
}

export interface IConversation {
  _id: string;
  title: string;
  model: 'gpt-4o' | 'gpt-4o-mini';
  searchEnabled: boolean;
  folder?: string;
  messageCount: number;
  systemPrompt?: string;
  isPublic?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
