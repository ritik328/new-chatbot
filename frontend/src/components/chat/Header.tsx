'use client';

import { useChatStore } from '@/store/useChatStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { PanelLeft } from 'lucide-react';

export const Header = () => {
  const { model, setModel, searchEnabled, setSearchEnabled, isSidebarOpen, toggleSidebar } = useChatStore();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background/60 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex flex-1 items-center justify-between">
        <div className="flex items-center gap-3">
          {!isSidebarOpen && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} title="Expand Sidebar" className="h-8 w-8">
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
          <h1 className="text-lg font-semibold tracking-tight">AI Startup Brain</h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center space-x-2">
            <Switch
              id="search-mode"
              checked={searchEnabled}
              onCheckedChange={setSearchEnabled}
            />
            <Label htmlFor="search-mode" className="text-sm font-medium leading-none">
              Web Search
            </Label>
          </div>
          
          <Select value={model} onValueChange={(value) => setModel(value as 'gpt-4o' | 'gpt-4o-mini')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </header>
  );
};
