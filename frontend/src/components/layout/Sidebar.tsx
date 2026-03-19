'use client';

import { useChatStore } from '@/store/useChatStore';
import { useProjectStore, IProject } from '@/store/useProjectStore';
import { fetchChats, deleteChat } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { PlusCircle, MessageSquare, Trash2, Search, PanelLeftClose, Moon, Sun, Settings, LayoutGrid, Plus, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { IConversation } from '@/types';
import { useTheme } from 'next-themes';
import { ProjectSettings } from '@/components/chat/ProjectSettings';

export const Sidebar = () => {
  const { 
    chats, setChats, activeChatId, setActiveChat, setActiveMessages,
    isSidebarOpen, toggleSidebar, setSettingsOpen
  } = useChatStore();
  
  const { 
    projects, activeProjectId, setActiveProject, fetchProjects, createProject 
  } = useProjectStore();

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsChat, setSettingsChat] = useState<IConversation | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchProjects();
  }, []);

  // Sync chats when active project changes
  useEffect(() => {
    fetchChats(activeProjectId).then(setChats);
  }, [activeProjectId]);

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

  const handleNewProject = async () => {
    const name = prompt('Project Name:');
    if (name) {
      const p = await createProject({ name, colour: '#'+Math.floor(Math.random()*16777215).toString(16) });
      setActiveProject(p._id);
    }
  }

  return (
    <div className={cn("flex h-full flex-col border-r bg-[#121212] md:bg-muted/10 transition-all duration-300 ease-in-out whitespace-nowrap overflow-hidden", isSidebarOpen ? "w-[280px] p-4 opacity-100" : "w-0 p-0 border-r-0 opacity-0")}>
      
      {/* Search & Actions */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <Button 
          onClick={() => { setActiveChat(null); setActiveMessages([]); }} 
          className="justify-start gap-2 h-10 rounded-xl text-sm font-medium flex-1 shadow-sm"
          variant={!activeChatId ? 'default' : 'outline'}
        >
          <PlusCircle className="h-4 w-4" />
          New Chat
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-10 w-10 shrink-0 rounded-xl">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-1 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40" />
          <Input 
            placeholder="Search history..." 
            className="pl-9 h-10 bg-muted/30 border-border rounded-xl text-sm focus:bg-muted/50 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2 no-scrollbar">
        <div className="space-y-8">
          
          {/* PROJECTS SECTION */}
          <div>
            <div className="flex items-center justify-between px-2 mb-3">
              <h3 className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-[0.15em] flex items-center gap-1.5">
                <LayoutGrid size={12} />
                Projects
              </h3>
              <button onClick={handleNewProject} className="p-1 hover:bg-muted rounded-md text-muted-foreground/50 hover:text-foreground transition-colors">
                <Plus size={14} />
              </button>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => setActiveProject(null)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all active:scale-[0.98]",
                  !activeProjectId ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className={cn("w-2 h-2 rounded-full", !activeProjectId ? "bg-primary" : "bg-muted-foreground/20")} />
                General Chat
              </button>

              {projects.map(p => (
                <button
                  key={p._id}
                  onClick={() => setActiveProject(p._id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all active:scale-[0.98] group",
                    activeProjectId === p._id ? "bg-muted text-foreground font-semibold shadow-sm" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-2 h-2 rounded-full shadow-sm shrink-0" style={{ backgroundColor: p.colour }} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {p.chatCount > 0 && (
                    <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded-md opacity-50 group-hover:opacity-100">
                      {p.chatCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* CHAT HISTORY SECTION */}
          <div className="space-y-6">
            {sortedGroups.map(group => (
              <div key={group}>
                <h3 className="px-2 mb-2 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">{group}</h3>
                {groupedChats[group].map(chat => (
                  <div key={chat._id} onClick={() => setActiveChat(chat._id)}
                    className={cn("group flex items-center justify-between px-2.5 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-1",
                      activeChatId === chat._id ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-muted/70")}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <MessageSquare className={cn("h-4 w-4 shrink-0", activeChatId === chat._id ? "text-primary-foreground" : "text-muted-foreground/50")} />
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate leading-tight">{chat.title}</span>
                        <span className={cn("text-[10px]", activeChatId === chat._id ? "text-primary-foreground/70" : "text-muted-foreground/40")}>
                          {formatDistanceToNow(new Date(chat.updatedAt))} ago
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

        </div>
      </ScrollArea>

      {/* FOOTER ACTIONS */}
      <div className="mt-auto py-3 px-2 border-t bg-muted/5 flex flex-col gap-1 shrink-0 rounded-2xl">
        <Button variant="ghost" className="justify-start gap-3 h-11 px-3 hover:bg-muted rounded-xl text-sm" onClick={() => setSettingsOpen(true)}>
          <Settings className="h-4 w-4 text-primary" />
          App Settings
        </Button>
        <Button variant="ghost" className="justify-start gap-3 h-11 px-3 hover:bg-muted rounded-xl text-sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {mounted && theme === "dark" ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
      </div>

      {/* Project Settings Modal */}
      {settingsChat && <ProjectSettings chat={settingsChat} onClose={() => setSettingsChat(null)} />}
    </div>
  );
};
