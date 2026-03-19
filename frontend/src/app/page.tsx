'use client';

import CleanChat from '@/components/CleanChat';
import { Sidebar } from '@/components/layout/Sidebar';
import { useChatStore } from '@/store/useChatStore';
import { cn } from '@/lib/utils';
import { SettingsModal } from '@/components/chat/SettingsModal';

export default function Home() {
  const { isSidebarOpen, toggleSidebar } = useChatStore();

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background relative">
      <SettingsModal />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-all duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] transition-all duration-300 transform md:relative md:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:w-0"
      )}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0 h-full relative">
        <CleanChat />
      </main>
    </div>
  );
}
