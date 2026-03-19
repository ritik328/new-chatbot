import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IConversation, IMessage } from '@/types';

interface SettingsState {
  // AI
  defaultModel: string;
  creativity: 'precise' | 'balanced' | 'creative';
  responseLength: 'auto' | 'short' | 'long';
  memoryEnabled: boolean;
  webSearchDefault: boolean;
  customSystemPrompt: string;
  aiLanguage: string;
  userApiKey: string;
  
  // UI
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  messageDensity: 'compact' | 'comfortable';
  codeBlockTheme: string;
  streamingEnabled: boolean;
  showTokenCount: boolean;
  enterKeyBehaviour: 'send' | 'newline';
  chatWidth: '720px' | '800px' | 'full';
  
  // Account (not persisted usually, but for mock purposes)
  profileName: string;
}

interface ChatState {
  chats: IConversation[];
  activeChatId: string | null;
  activeMessages: IMessage[];
  model: string;
  searchEnabled: boolean;
  isGenerating: boolean;
  isLoadingChats: boolean;
  isSidebarOpen: boolean;
  isSettingsOpen: boolean;
  abortController: AbortController | null;
  
  // App Settings
  settings: SettingsState;
  
  // Actions
  setChats: (chats: IConversation[]) => void;
  setActiveChat: (chatId: string | null) => void;
  setActiveMessages: (messages: IMessage[]) => void;
  addMessage: (message: IMessage) => void;
  updateLastMessage: (content: string) => void;
  updateMessage: (messageId: string, updates: Partial<IMessage>) => void;
  setModel: (model: string) => void;
  setSearchEnabled: (enabled: boolean) => void;
  setIsGenerating: (generating: boolean) => void;
  setIsLoadingChats: (loading: boolean) => void;
  toggleSidebar: () => void;
  setSettingsOpen: (open: boolean) => void;
  updateSettings: (updates: Partial<SettingsState>) => void;
  setAbortController: (controller: AbortController | null) => void;
  stopGeneration: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: [],
      activeChatId: null,
      activeMessages: [],
      model: 'gpt-4o-mini',
      searchEnabled: false,
      isGenerating: false,
      isLoadingChats: false,
      isSidebarOpen: true,
      isSettingsOpen: false,
      abortController: null,

      settings: {
        defaultModel: 'gpt-4o-mini',
        creativity: 'balanced',
        responseLength: 'auto',
        memoryEnabled: true,
        webSearchDefault: false,
        customSystemPrompt: '',
        aiLanguage: 'English',
        userApiKey: '',
        theme: 'system',
        fontSize: 'medium',
        messageDensity: 'comfortable',
        codeBlockTheme: 'one-dark',
        streamingEnabled: true,
        showTokenCount: false,
        enterKeyBehaviour: 'send',
        chatWidth: '720px',
        profileName: 'Guest User'
      },

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
      setSettingsOpen: (isSettingsOpen) => set({ isSettingsOpen }),
      updateSettings: (updates) => set((state) => ({
        settings: { ...state.settings, ...updates }
      })),
      setAbortController: (abortController) => set({ abortController }),
      stopGeneration: () => set((state) => {
        if (state.abortController) {
          state.abortController.abort();
        }
        return { isGenerating: false, abortController: null };
      })
    }),
    {
      name: 'chatbot-storage',
      partialize: (state) => ({ 
        settings: state.settings,
        model: state.model,
        searchEnabled: state.searchEnabled
      }),
    }
  )
);
