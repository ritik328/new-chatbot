'use client';

import { useChatStore } from '@/store/useChatStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import 'katex/dist/katex.min.css';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SearchSource, IMessage } from '@/types';
import { updateMessageReaction as apiUpdateReaction } from '@/lib/api';

const CodeBlock = ({ language, children }: { language: string, children: string }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-gray-700/30 dark:border-gray-700 my-4 bg-zinc-900/90 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-gray-700/50">
        <span className="text-xs text-zinc-400 font-mono font-medium">{language || 'code'}</span>
        <button
          onClick={copy}
          className="text-xs text-zinc-400 hover:text-white transition-colors tracking-wide"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <SyntaxHighlighter
        style={dracula as any}
        language={language}
        PreTag="div"
        customStyle={{ margin: 0, padding: '1rem', borderRadius: 0, fontSize: '13px', background: 'transparent' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export const MessageList = () => {
  const { activeChatId, activeMessages, isGenerating, updateMessage, setIsGenerating, stopGeneration } = useChatStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeMessages, isGenerating]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleReact = async (msgId: string, currentReaction: 'upvote' | 'downvote' | null, newReaction: 'upvote' | 'downvote') => {
    if (!activeChatId) return;
    const finalReaction = currentReaction === newReaction ? null : newReaction;
    
    // Optimistic UI update
    updateMessage(msgId, { reaction: finalReaction });
    
    try {
      await apiUpdateReaction(activeChatId, msgId, finalReaction);
    } catch {
      // Revert on failure
      updateMessage(msgId, { reaction: currentReaction });
    }
  };

  const handleRegenerate = async () => {
    if (!activeChatId || isGenerating) return;
    setIsGenerating(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/chats/${activeChatId}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to regenerate');
      if (!response.body) return;

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
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.type === 'token') {
                assistantText += data.content;
                updateMessage(activeMessages[activeMessages.length - 1]._id, { content: assistantText });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.error('Regeneration failed', e);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-12">
        {activeMessages.length === 0 ? (
          <div className="mt-[20vh] flex flex-col items-center justify-center text-center">
            <h2 className="text-3xl font-semibold tracking-tight">How can I help you today?</h2>
            <p className="mt-2 text-muted-foreground">
              Powered by deep reasoning and web grounding.
            </p>
          </div>
        ) : (
          activeMessages.map((msg, idx) => (
            <div
              key={msg._id || idx}
              className={cn(
                "flex w-full overflow-hidden gap-3",
                msg.role === 'user' ? "flex-row-reverse" : ""
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-medium text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                {msg.role === 'user' ? 'You' : 'AI'}
              </div>

              <div
                className={cn(
                  "relative max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                  msg.role === 'user'
                    ? "bg-purple-50 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100"
                    : "bg-background border shadow-sm"
                )}
              >
                
                <div className="flex flex-col gap-2 overflow-hidden">
                  <div className={cn(
                    "prose prose-sm break-words dark:prose-invert",
                    msg.role === 'user' && "text-purple-900 dark:text-purple-100 prose-a:text-purple-700 dark:prose-a:text-purple-300 prose-p:leading-relaxed"
                  )}>
                    {msg.content ? (
                       <ReactMarkdown 
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          code({ inline, className, children, ...props }: any) {
                            const language = className?.replace('language-', '') || '';
                            return !inline ? (
                              <CodeBlock language={language}>
                                {String(children).replace(/\n$/, '')}
                              </CodeBlock>
                            ) : (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="flex h-5 items-center space-x-1 opacity-70">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]"></span>
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"></span>
                      </span>
                    )}
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 flex flex-col gap-2 border-t pt-4">
                      <p className="text-xs font-semibold text-muted-foreground">Sources:</p>
                      <div className="flex flex-wrap gap-2">
                        {msg.sources.map((src: SearchSource, i: number) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex max-w-[200px] items-center gap-1 truncate rounded-md bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Reaction Toolbar */}
                {msg.role === 'assistant' && msg.content && !isGenerating && (
                  <div className="absolute -bottom-4 left-14 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1 rounded-md border bg-background px-1 py-0.5 shadow-sm text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-sm hover:text-foreground"
                      onClick={() => handleCopy(msg._id, msg.content)}
                      title="Copy Message"
                    >
                      {copiedId === msg._id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-6 w-6 rounded-sm hover:text-foreground", msg.reaction === 'upvote' && "text-green-500 hover:text-green-600")}
                      onClick={() => handleReact(msg._id, msg.reaction || null, 'upvote')}
                      title="Good Response"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn("h-6 w-6 rounded-sm hover:text-foreground", msg.reaction === 'downvote' && "text-destructive hover:text-destructive")}
                      onClick={() => handleReact(msg._id, msg.reaction || null, 'downvote')}
                      title="Bad Response"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                    
                    {idx === activeMessages.length - 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-sm hover:text-foreground ml-1"
                        onClick={handleRegenerate}
                        title="Regenerate Response"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={scrollRef} />
        
        {/* Floating Stop Button inside Message Area */}
        {isGenerating && (
          <div className="sticky bottom-4 mx-auto flex w-fit justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={stopGeneration}
              className="gap-2 rounded-full border shadow-md font-medium"
            >
              <div className="h-2 w-2 rounded-[2px] bg-foreground/80" />
              Stop generating
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
