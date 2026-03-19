'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { fetchChatById, createChat } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, StopCircle } from 'lucide-react';
import { IMessage } from '@/types';

export const ChatInput = () => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    activeChatId, 
    setActiveChat,
    activeMessages,
    setActiveMessages,
    addMessage, 
    updateLastMessage,
    isGenerating, 
    setIsGenerating,
    model,
    searchEnabled,
    setAbortController,
    stopGeneration
  } = useChatStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleStop = () => {
    stopGeneration();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isGenerating) return;

    let chatId = activeChatId;
    const userText = input.trim();
    setInput('');
    setIsGenerating(true);

    // Create a new chat if none is selected
    if (!chatId) {
      try {
        const newChat = await createChat(model, searchEnabled);
        chatId = newChat._id;
        setActiveChat(chatId);
        setActiveMessages([]);
      } catch (err) {
        console.error('Failed to create chat', err);
        setIsGenerating(false);
        return;
      }
    }

    // Add user message optimistically
    const userMsg: IMessage = {
      _id: Date.now().toString(),
      conversationId: chatId,
      role: 'user',
      content: userText,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    // Add empty assistant message placeholder
    const assistantMsg: IMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: chatId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    addMessage(assistantMsg);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/chats/${chatId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: userText,
          useSearch: searchEnabled
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'token') {
                assistantText += data.content;
                updateLastMessage(assistantText);
              } else if (data.type === 'done') {
                // optionally handle sources
              } else if (data.type === 'error') {
                console.error('Stream error:', data.message);
              }
            } catch (e) {
              // ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Stream failed:', err);
        // If it failed completely, replace the empty bubble with an error indicator
        updateLastMessage('⚠️ **Error:** Failed to connect to AI (Check your API keys).');
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative mx-auto flex w-full max-w-3xl items-center pb-4 pt-2">
      <div className="relative flex w-full flex-col p-4">
        <form
          onSubmit={handleSubmit}
          className="relative flex w-full items-end gap-2 rounded-xl border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring"
        >
          <Textarea
            ref={textareaRef}
            placeholder="Send a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="max-h-52 min-h-[44px] w-full resize-none border-0 bg-transparent py-3 focus-visible:ring-0 sm:text-sm"
            rows={1}
          />
          <div className="mb-[2px]">
            {isGenerating ? (
              <Button size="icon" variant="ghost" type="button" onClick={handleStop} className="h-9 w-9">
                <StopCircle className="h-5 w-5 text-destructive" />
                <span className="sr-only">Stop generating</span>
              </Button>
            ) : (
              <Button size="icon" type="submit" disabled={!input.trim()} className="h-9 w-9">
                <Send className="h-4 w-4" />
                <span className="sr-only">Send message</span>
              </Button>
            )}
          </div>
        </form>
        <div className="px-3 pt-2 text-center text-xs text-muted-foreground">
          AI messages can make mistakes. Consider verifying important information.
        </div>
      </div>
    </div>
  );
};
