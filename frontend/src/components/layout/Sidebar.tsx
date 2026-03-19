'use client';

import { useChatStore } from '@/store/useChatStore';
import { fetchChats, deleteChat } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { PlusCircle, MessageSquare, Trash2, FolderPen, Search, PanelLeftClose, Moon, Sun, Settings } from 'lucide-react';
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
    toggleSidebar,
    setSettingsOpen
  } = useChatStore();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsChat, setSettingsChat] = useState<IConversation | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedChats = filteredChats.reduce((acc, chat) => {
    const date = new Date(chat.updatedAt);
    let group = 'Older';
    if (date.toDateString() === new Date().toDateString()) group = 'Today';
    else if (date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) group = 'Last 7 Days';
    if (!acc[group]) acc[group] = [];
    acc[group].push(chat);
    return acc;
  }, {} as Record<string, IConversation[]>);

  const sortedGroups = Object.keys(groupedChats).sort((a, b) => {
    if (a === 'Today') return -1;
    if (b === 'Today') return 1;
    if (a === 'Last 7 Days') return -1;
    if (b === 'Last 7 Days') return 1;
    return a.localeCompare(b);
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
      await deleteChat(id);
      const updated = await fetchChats();
      setChats(updated);
      if (activeChatId === id) {
        setActiveChat(null);
        setActiveMessages([]);
      }
    }
  }

  return (
    <div className={cn("flex h-full flex-col border-r bg-[#121212] md:bg-muted/10 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden", isSidebarOpen ? "w-[280px] p-4 opacity-100" : "w-0 p-0 border-r-0 opacity-0")}>
      
      <div className="flex items-center justify-between mb-4">
        <Button 
          onClick={() => { setActiveChat(null); setActiveMessages([]); }} 
          className="justify-start gap-2 h-10 rounded-xl text-sm font-medium flex-1 mr-2"
          variant={!activeChatId ? 'default' : 'outline'}
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Collapse Sidebar" className="h-10 w-10 shrink-0">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-1 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input 
            placeholder="Search chats..." 
            className="pl-9 h-10 bg-muted/50 border-border rounded-xl text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full pr-4 no-scrollbar">
          <div className="space-y-6">
            {sortedGroups.map(group => (
              <div key={group}>
                <h3 className="px-2 mb-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{group}</h3>
                {groupedChats[group].map(chat => (
                  <div key={chat._id} onClick={() => setActiveChat(chat._id)}
                    className={cn("group flex items-center justify-between px-2 py-2 rounded-xl cursor-pointer transition-all duration-200 mb-0.5",
                      activeChatId === chat._id ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted")}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={cn("h-4 w-4 shrink-0", activeChatId === chat._id ? "text-primary-foreground" : "text-muted-foreground")} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{chat.title}</span>
                        <span className={cn("text-[10px]", activeChatId === chat._id ? "text-primary-foreground/70" : "text-muted-foreground/40")}>
                          {formatDistanceToNow(new Date(chat.updatedAt))} ago
                        </span>
                      </div>
                    </div>
                    <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", activeChatId === chat._id && "opacity-100")}>
                       <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); setSettingsChat(chat); }}><Settings className="h-3.5 w-3.5" /></Button>
                       <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={(e) => handleDelete(e, chat._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Settings / Theme Toggle */}
      <div className="mt-auto py-4 px-2 border-t bg-muted/10 flex flex-col gap-1 shrink-0 rounded-2xl items-stretch">
        <Button 
          variant="ghost" 
          className="justify-start gap-3 w-full h-11 px-3 hover:bg-muted rounded-xl text-sm font-medium transition-all" 
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4 text-primary" />
          App Settings
        </Button>
        <Button 
          variant="ghost" 
          className="justify-start gap-3 w-full h-11 px-3 hover:bg-muted rounded-xl text-sm font-medium transition-all" 
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
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
