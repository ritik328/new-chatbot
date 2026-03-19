'use client';

import { useChatStore } from '@/store/useChatStore';
import { fetchChats, fetchChatById, deleteChat } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { PlusCircle, MessageSquare, Trash2, FolderPen, Folder, Search, PanelLeftClose, Moon, Sun, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { IConversation } from '@/types';
import { useTheme } from 'next-themes';
import { ProjectSettings } from '@/components/chat/ProjectSettings';

export const Sidebar = () => {
  const { 
    chats, 
    setChats, 
    activeChatId, 
    setActiveChat, 
    setActiveMessages,
    setIsLoadingChats,
    isSidebarOpen,
    toggleSidebar
  } = useChatStore();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsChat, setSettingsChat] = useState<IConversation | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadChats(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadChats = async (query?: string) => {
    try {
      setIsLoadingChats(true);
      const data = await fetchChats(query);
      setChats(data);
    } catch (e) {
      console.error('Failed to load chats');
    } finally {
      setIsLoadingChats(false);
    }
  };

  const handleSelectChat = async (id: string) => {
    if (activeChatId === id) return;
    try {
      setActiveChat(id);
      const data = await fetchChatById(id);
      setActiveMessages(data.messages);
    } catch (e) {
      console.error('Failed to load chat messages');
    }
  };

  const handleNewChat = () => {
    setActiveChat(null);
    setActiveMessages([]);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await deleteChat(id);
      setChats(chats.filter((c) => c._id !== id));
      if (activeChatId === id) {
        handleNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat', error);
    }
  };

  const handleEditFolder = async (e: React.MouseEvent, id: string, currentFolder: string = '') => {
    e.stopPropagation();
    const newFolder = window.prompt('Enter folder name (leave empty to clear folder):', currentFolder);
    if (newFolder !== null) {
      try {
        const { updateChat } = await import('@/lib/api');
        const updated = await updateChat(id, { folder: newFolder.trim() || undefined });
        setChats(chats.map(c => c._id === id ? { ...c, folder: updated.folder } : c));
      } catch (err) {
        console.error('Failed to update folder');
      }
    }
  };

  // Group chats by folder
  const groupedChats = chats.reduce((acc, chat) => {
    const folderName = chat.folder || 'Uncategorized';
    if (!acc[folderName]) acc[folderName] = [];
    acc[folderName].push(chat);
    return acc;
  }, {} as Record<string, IConversation[]>);

  // Sort folders to keep Uncategorized at the bottom
  const sortedFolders = Object.keys(groupedChats).sort((a, b) => {
    if (a === 'Uncategorized') return 1;
    if (b === 'Uncategorized') return -1;
    return a.localeCompare(b);
  });

  return (
    <div 
      className={cn(
        "flex h-full flex-col border-r bg-muted/40 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden",
        isSidebarOpen ? "w-64 p-4 opacity-100" : "w-0 p-0 border-r-0 opacity-0"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <Button 
          onClick={handleNewChat} 
          className="justify-start gap-2 h-10 rounded-xl text-sm font-medium flex-1 mr-2"
          variant={!activeChatId ? 'default' : 'outline'}
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Collapse Sidebar" className="h-10 w-10 shrink-0">
          <PanelLeftClose className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input 
          type="search" 
          placeholder="Search history..." 
          className="pl-9 bg-background/50 h-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-hidden -mx-2">
        <ScrollArea className="h-full px-2">
          <div className="flex flex-col gap-4 pb-4">
            {chats.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                No conversations found
              </p>
            )}

            {sortedFolders.map((folder) => (
              <div key={folder} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {folder !== 'Uncategorized' && <Folder className="h-3 w-3" />}
                  {folder}
                </div>
                {groupedChats[folder].map((chat) => (
                  <div
                    key={chat._id}
                    onClick={() => handleSelectChat(chat._id)}
                    className={cn(
                      "group relative flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                      activeChatId === chat._id ? "bg-accent/80 font-medium text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <div className="flex flex-1 flex-col truncate pr-8">
                      <span className="truncate">{chat.title}</span>
                    </div>

                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100 bg-gradient-to-l from-accent via-accent to-transparent pl-4">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={(e) => { e.stopPropagation(); setSettingsChat(chat); }}
                        title="Project Settings (AI & Stats)"
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-muted"
                        onClick={(e) => handleEditFolder(e, chat._id, chat.folder)}
                        title="Move to Folder"
                      >
                        <FolderPen className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={(e) => handleDelete(e, chat._id)}
                        title="Delete Chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Settings / Theme Toggle Tab */}
      <div className="mt-auto pt-4 border-t flex flex-col gap-2">
        <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 flex items-center gap-2">
          <Settings className="h-3 w-3" />
          Settings
        </div>
        <Button 
          variant="ghost" 
          className="justify-start gap-3 w-full px-2 hover:bg-accent" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Toggle Theme
        </Button>
      </div>
      {/* Project Settings Modal */}
      {settingsChat && (
        <ProjectSettings 
          chat={settingsChat} 
          onClose={() => setSettingsChat(null)} 
        />
      )}
    </div>
  );
};
