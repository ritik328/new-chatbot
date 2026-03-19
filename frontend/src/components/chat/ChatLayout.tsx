import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/chat/Header';
import { ChatInput } from '@/components/chat/ChatInput';
import { MessageList } from '@/components/chat/MessageList';

export const ChatLayout = () => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header />
        <main className="relative flex flex-1 flex-col overflow-hidden w-full h-full min-h-0">
          <MessageList />
          <div className="w-full shrink-0">
            <ChatInput />
          </div>
        </main>
      </div>
    </div>
  );
};
