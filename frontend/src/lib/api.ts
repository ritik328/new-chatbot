import axios from 'axios';
import { IConversation, IMessage, ApiResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Chats API ─────────────────────────────────────────────────────────────
export const fetchChats = async (projectId?: string | null): Promise<IConversation[]> => {
  const url = projectId ? `/projects/${projectId}/chats` : '/chats';
  const { data } = await api.get<ApiResponse<{ chats: IConversation[] }>>(url);
  return data.data?.chats || [];
};

export const fetchChatById = async (id: string): Promise<{ chat: IConversation; messages: IMessage[] }> => {
  const { data } = await api.get<ApiResponse<{ chat: IConversation; messages: IMessage[] }>>(`/chats/${id}`);
  if (!data.data) throw new Error('Failed to fetch chat');
  return data.data;
};

export const createChat = async (model: string, searchEnabled: boolean, projectId?: string | null): Promise<IConversation> => {
  const { data } = await api.post<ApiResponse<{ chat: IConversation }>>('/chats', {
    model,
    searchEnabled,
    projectId
  });
  if (!data.data) throw new Error('Failed to create chat');
  return data.data.chat;
};

export const updateChat = async (id: string, updates: Partial<IConversation>): Promise<IConversation> => {
  const { data } = await api.patch<ApiResponse<{ chat: IConversation }>>(`/chats/${id}`, updates);
  if (!data.data) throw new Error('Failed to update chat');
  return data.data.chat;
};

export const deleteChat = async (id: string): Promise<void> => {
  await api.delete(`/chats/${id}`);
};

export const updateMessageReaction = async (
  conversationId: string,
  messageId: string,
  reaction: 'upvote' | 'downvote' | null
): Promise<IMessage> => {
  const { data } = await api.patch<ApiResponse<{ message: IMessage }>>(
    `/chats/${conversationId}/messages/${messageId}/reaction`,
    { reaction }
  );
  if (!data.data?.message) throw new Error('Failed to update reaction');
  return data.data.message;
};

// ── Knowledge Base API ──────────────────────────────────────────────────
export const uploadKnowledgeBaseFile = async (conversationId: string, file: File): Promise<{ filename: string; chunks: number }> => {
  const formData = new FormData();
  formData.append('document', file);
  
  const { data } = await api.post(`/knowledge/upload/${conversationId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data;
};

// ── Public Sharing API ──────────────────────────────────────────────────
export const shareChat = async (id: string): Promise<string> => {
  const { data } = await api.patch(`/chats/${id}/share`);
  return data.data.shareUrl;
};

export const fetchPublicChat = async (id: string): Promise<{ chat: Partial<IConversation>; messages: IMessage[] }> => {
  const { data } = await api.get(`/chats/${id}/public`);
  return data.data;
};

