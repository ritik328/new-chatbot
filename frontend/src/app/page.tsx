import CleanChat from '@/components/CleanChat';
import { Sidebar } from '@/components/layout/Sidebar';

export default function Home() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden min-w-0 h-full">
        <CleanChat />
      </main>
    </div>
  );
}
