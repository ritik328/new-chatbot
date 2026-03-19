import { create } from 'zustand';
import { IConversation, IMessage } from '@/types';

interface ChatState {
  chats: IConversation[];
  activeChatId: string | null;
  activeMessages: IMessage[];
  model: 'gpt-4o' | 'gpt-4o-mini';
  searchEnabled: boolean;
  isGenerating: boolean;
  isLoadingChats: boolean;
  isSidebarOpen: boolean;
  abortController: AbortController | null;
  
  // Actions
  setChats: (chats: IConversation[]) => void;
  setActiveChat: (chatId: string | null) => void;
  setActiveMessages: (messages: IMessage[]) => void;
  addMessage: (message: IMessage) => void;
  updateLastMessage: (content: string) => void;
  updateMessage: (messageId: string, updates: Partial<IMessage>) => void;
  setModel: (model: 'gpt-4o' | 'gpt-4o-mini') => void;
  setSearchEnabled: (enabled: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsLoadingChats: (loading: boolean) => void;
  toggleSidebar: () => void;
  setAbortController: (controller: AbortController | null) => void;
  stopGeneration: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  activeChatId: null,
  activeMessages: [],
  model: 'gpt-4o-mini',
  searchEnabled: false,
  isGenerating: false,
  isLoadingChats: false,
  isSidebarOpen: true,
  abortController: null,

  setChats: (chats) => set({ chats }),
  setActiveChat: (chatId) => set({ activeChatId: chatId }),
  setActiveMessages: (messages) => set({ activeMessages: messages }),
  addMessage: (message) =>
    set((state) => ({ activeMessages: [...state.activeMessages, message] })),
  updateLastMessage: (content) =>
    set((state) => {
      const msgs = [...state.activeMessages];
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
        msgs[msgs.length - 1].content = content;
      }
      return { activeMessages: msgs };
    }),
  updateMessage: (messageId, updates) =>
    set((state) => ({
      activeMessages: state.activeMessages.map((m) =>
        m._id === messageId ? { ...m, ...updates } : m
      ),
    })),
  setModel: (model) => set({ model }),
  setSearchEnabled: (searchEnabled) => set({ searchEnabled }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setIsLoadingChats: (isLoading) => set({ isLoadingChats: isLoading }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setAbortController: (abortController) => set({ abortController }),
  stopGeneration: () => set((state) => {
    if (state.abortController) {
      state.abortController.abort();
    }
    return { isGenerating: false, abortController: null };
  })
}));
