'use client'
// ================================================================
//  CleanChat.tsx — Claude-style clean chat UI
//  Features:
//    - No bubbles — clean flat layout like Claude
//    - User message: black box, white text
//    - AI response: plain white text, no box
//    - File upload icon in input area
//    - Model selector in input area
//    - Stop generation button in input area
//  Stack: Next.js + Tailwind CSS
// ================================================================

import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import 'katex/dist/katex.min.css'
import { useChatStore } from '@/store/useChatStore'
import { createChat } from '@/lib/api'
import { IMessage } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

// ── available models ──────────────────────────────────────────
const MODELS = [
  { id: 'gpt-4o-mini',      label: 'GPT-4o Mini' },
  { id: 'gpt-4o',           label: 'GPT-4o'      },
  { id: 'gpt-4-turbo',      label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo',    label: 'GPT-3.5'     },
]

// ── icons (inline SVG — no extra deps) ───────────────────────
const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19
             a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
  </svg>
)
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
)
const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
  </svg>
)
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)
const IconFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

// ── code block with copy button ───────────────────────────────
function CodeBlock({ language, children }: any) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden my-4 border border-white/10">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800">
        <span className="text-xs text-zinc-400 font-mono">{language || 'code'}</span>
        <button onClick={copy}
          className="text-xs text-zinc-400 hover:text-white transition-colors px-2 py-1 rounded">
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark as any}
        language={language || 'text'}
        PreTag="div"
        customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', background: '#18181b' }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

// ── markdown renderer for AI responses ───────────────────────
function AIMarkdown({ content }: any) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        // code blocks
        code({ inline, className, children }: any) {
                        const match = /language-(\w+)/.exec(className || '')
                        const lang = match ? match[1] : ''
                        
                        // Render Native Graphical Charts
                        if (!inline && lang === 'chart') {
                          try {
                            const rawJson = String(children).trim();
                            const data = JSON.parse(rawJson);
                            return (
                              <div className="w-full h-[300px] mt-4 mb-4 bg-white/5 border border-white/10 rounded-xl p-6 shadow-xl">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#ffffff40" fontSize={11} tickLine={false} axisLine={false} />
                                    <Tooltip 
                                      cursor={{ fill: 'rgba(255,255,255,0.02)' }} 
                                      contentStyle={{ backgroundColor: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                                      itemStyle={{ color: '#4ade80' }}
                                    />
                                    <Bar dataKey="value" fill="#4ade80" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            )
                          } catch (e) {
                            return <div className="p-4 bg-red-500/10 text-red-400 text-xs rounded-lg border border-red-500/20">Error rendering chart data: Invalid JSON.</div>
                          }
                        }

                        // Render Syntax Highlighting
                        return !inline
            ? <CodeBlock language={lang}>{String(children).trim()}</CodeBlock>
            : <code className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded text-sm font-mono">
                {children}
              </code>
        },
        // headings
        h1: ({ children }) => <h1 className="text-2xl font-semibold mt-6 mb-3 text-white">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2 text-white">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1 text-white">{children}</h3>,
        // paragraphs
        p: ({ children }) => <p className="mb-3 leading-7 text-white/90 text-[15px]">{children}</p>,
        // lists
        ul: ({ children }) => <ul className="mb-3 space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 space-y-1 pl-5 list-decimal">{children}</ol>,
        li: ({ children }) => (
          <li className="text-white/90 text-[15px] leading-7 list-disc marker:text-white/40">
            {children}
          </li>
        ),
        // blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-white/30 pl-4 my-3 text-white/60 italic">
            {children}
          </blockquote>
        ),
        // table
        table: ({ children }) => (
          <div className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="text-left px-3 py-2 border border-white/10 text-white/70 font-medium text-xs uppercase tracking-wide bg-white/5">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border border-white/10 text-white/80 text-[13px]">{children}</td>
        ),
        // horizontal rule
        hr: () => <hr className="my-6 border-white/10" />,
        // bold & italic
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/80">{children}</em>,
        // links
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ── typing indicator ──────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map(i => (
        <span key={i}
          className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  )
}

// ── file preview pill ─────────────────────────────────────────
function FilePill({ file, onRemove }: any) {
  return (
    <div className="flex items-center gap-2 bg-white/10 border border-white/15
                    rounded-lg px-3 py-1.5 text-xs text-white/70">
      <IconFile />
      <span className="max-w-[120px] truncate">{file.name}</span>
      <button onClick={onRemove} className="text-white/40 hover:text-white/80 transition-colors ml-1">
        <IconX />
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════
export default function CleanChat() {
  const [input, setInput]             = useState('')
  const [files, setFiles]             = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [modelOpen, setModelOpen]     = useState(false)
  const bottomRef                     = useRef<HTMLDivElement>(null)
  const fileInputRef                  = useRef<HTMLInputElement>(null)
  const textareaRef                   = useRef<HTMLTextAreaElement>(null)
  const { 
    isSidebarOpen, toggleSidebar, searchEnabled, setSearchEnabled,
    activeMessages, activeChatId, setActiveChat, setActiveMessages,
    addMessage, updateLastMessage, isGenerating, setIsGenerating,
    setAbortController, stopGeneration
  } = useChatStore()

  // auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeMessages, isGenerating])

  // auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  // ── send message ────────────────────────────────────────
  const send = async () => {
    const text = input.trim()
    if (!text && files.length === 0) return
    if (isGenerating) return

    let chatId = activeChatId;
    setInput('')
    setFiles([])
    setIsGenerating(true)

    if (!chatId) {
      try {
        const newChat = await createChat(selectedModel as 'gpt-4o' | 'gpt-4o-mini', searchEnabled);
        chatId = newChat._id;
        setActiveChat(chatId);
        setActiveMessages([]);
      } catch (err) {
        console.error('Failed to create chat', err);
        setIsGenerating(false);
        return;
      }
    }

    const userMsg: IMessage = {
      _id: Date.now().toString(),
      conversationId: chatId as string,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);

    const assistantMsg: IMessage = {
      _id: (Date.now() + 1).toString(),
      conversationId: chatId as string,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
    };
    addMessage(assistantMsg);

    const controller = new AbortController()
    setAbortController(controller)

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/chats/${chatId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          content: text,
          useSearch: searchEnabled
        }),
      })

      if (!res.body) throw new Error('No response body');
      
      const reader = res.body.getReader();
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
        updateLastMessage('⚠️ **Error:** Failed to connect to AI server.');
      }
    } finally {
      setIsGenerating(false)
      setAbortController(null)
    }
  }

  // ── stop generation ─────────────────────────────────────
  const stop = () => {
    stopGeneration()
  }

  // ── handle file selection ────────────────────────────────
  const handleFiles = (e: any) => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected].slice(0, 5)) // max 5 files
    e.target.value = ''
  }

  // ── keyboard: Enter to send, Shift+Enter for newline ────
  const handleKey = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const selectedModelLabel = MODELS.find(m => m.id === selectedModel)?.label || 'Model'

  // ════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-[#0f0f0f] text-white">

      {/* ── messages area ──────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative">

        {!isSidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Open Sidebar"
            className="fixed top-4 left-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-[60] md:z-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
               <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        )}

        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-8">

          {/* empty state */}
          {activeMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10
                              flex items-center justify-center text-white/40 text-lg font-light">
                ✦
              </div>
              <p className="text-white/30 text-sm">Start a conversation</p>
            </div>
          )}

          {/* messages */}
          {activeMessages.map((msg, i) => (
            <div key={i} className="flex flex-col gap-1">

              {/* USER MESSAGE — black box, white text */}
              {msg.role === 'user' && (
                <div className="flex justify-end">
                  <div className="flex flex-col gap-2 items-end max-w-[85%]">
                    {/* file pills above message */}
                    {(msg as any).files?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {(msg as any).files.map((f: any, fi: number) => (
                          <div key={fi}
                            className="flex items-center gap-1.5 bg-white/5 border border-white/10
                                       rounded-lg px-2.5 py-1 text-xs text-white/50">
                            <IconFile />
                            <span className="max-w-[100px] truncate">{f.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* message box */}
                    {msg.content && (
                      <div className="bg-white text-black rounded-2xl rounded-br-sm
                                      px-4 py-3 text-[15px] leading-7 font-normal">
                        {msg.content}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI RESPONSE — plain white text, no box */}
              {msg.role === 'assistant' && (
                <div className="flex flex-col gap-1">
                  {/* subtle label */}
                  <span className="text-xs text-white/20 mb-1 font-mono">assistant</span>
                  <div className="text-white/90">
                    {msg.content === '' && isGenerating && i === activeMessages.length - 1 ? (
                      <TypingDots />
                    ) : (
                      <AIMarkdown content={msg.content} />
                    )}
                  </div>
                </div>
              )}

            </div>
          ))}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── input area ─────────────────────────────────── */}
      <div className="px-3 md:px-4 pb-4 md:pb-6 pt-2">
        <div className="max-w-2xl mx-auto">

          {/* file previews above input */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2 px-1">
              {files.map((f, i) => (
                <FilePill key={i} file={f}
                  onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
          )}

          {/* input box */}
          <div className="relative flex flex-col bg-[#1a1a1a] border border-white/10
                          rounded-2xl overflow-hidden
                          focus-within:border-white/25 transition-colors">

            {/* textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Message..."
              rows={1}
              className="w-full bg-transparent text-white/90 placeholder-white/25
                         text-[15px] leading-7 px-4 pt-3.5 pb-2
                         resize-none outline-none min-h-[52px] max-h-[200px] custom-scrollbar"
            />

            {/* bottom toolbar */}
            <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">

              {/* LEFT: file upload + model selector */}
              <div className="flex items-center gap-2">

                {/* file upload button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  className="flex items-center justify-center w-8 h-8 rounded-lg
                             text-white/35 hover:text-white/70 hover:bg-white/5
                             transition-all"
                >
                  <IconPaperclip />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.js,.jsx,.ts,.tsx,.py,.json,.csv,.png,.jpg,.jpeg"
                  onChange={handleFiles}
                  className="hidden"
                />

                {/* search toggle */}
                <button
                  onClick={() => setSearchEnabled(!searchEnabled)}
                  className={`flex items-center gap-1.5 px-2 h-7 md:h-8 rounded-lg text-[10px] md:text-xs font-mono transition-all border
                              ${searchEnabled 
                                ? 'bg-white/10 text-white border-white/20 hover:bg-white/15' 
                                : 'text-white/40 border-transparent hover:text-white/70 hover:bg-white/5 hover:border-white/10'}`}
                >
                  <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${searchEnabled ? 'bg-green-400' : 'bg-white/30'}`} />
                  <span className="hidden xs:inline">Web Search</span>
                  <span className="xs:hidden">Search</span>
                </button>

                {/* model selector */}
                <div className="relative">
                  <button
                    onClick={() => setModelOpen(o => !o)}
                    className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg
                               text-white/40 hover:text-white/70 hover:bg-white/5
                               text-xs font-mono transition-all border border-transparent
                               hover:border-white/10"
                  >
                    <span>{selectedModelLabel}</span>
                    <IconChevron />
                  </button>

                  {/* dropdown */}
                  {modelOpen && (
                    <div className="absolute bottom-full left-0 mb-2 w-48
                                    bg-[#1a1a1a] border border-white/10 rounded-xl
                                    shadow-2xl overflow-hidden z-50">
                      {MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { setSelectedModel(m.id); setModelOpen(false) }}
                          className={`w-full text-left px-3 py-2.5 text-xs font-mono
                                      transition-colors hover:bg-white/5
                                      ${selectedModel === m.id
                                        ? 'text-white bg-white/5'
                                        : 'text-white/45'}`}
                        >
                          {selectedModel === m.id && (
                            <span className="inline-block w-1.5 h-1.5 rounded-full
                                             bg-white mr-2 mb-0.5" />
                          )}
                          {m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: stop or send */}
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  /* stop button */
                  <button
                    onClick={stop}
                    className="flex items-center gap-1.5 px-3 h-8 rounded-lg
                               bg-white/10 hover:bg-white/15 border border-white/10
                               text-white/60 hover:text-white text-xs transition-all"
                  >
                    <IconStop />
                    <span>Stop</span>
                  </button>
                ) : (
                  /* send button */
                  <button
                    onClick={send}
                    disabled={!input.trim() && files.length === 0}
                    className="flex items-center justify-center w-8 h-8 rounded-lg
                               bg-white text-black disabled:bg-white/10
                               disabled:text-white/20 hover:bg-white/90
                               transition-all disabled:cursor-not-allowed"
                  >
                    <IconSend />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* hint */}
          <p className="text-center text-white/15 text-xs mt-3">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

    </div>
  )
}
