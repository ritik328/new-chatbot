'use client'

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

const MODELS = [
  { id: 'gpt-4o-mini',      label: 'GPT-4o Mini' },
  { id: 'gpt-4o',           label: 'GPT-4o'      },
  { id: 'gpt-4-turbo',      label: 'GPT-4 Turbo' },
  { id: 'gpt-3.5-turbo',    label: 'GPT-3.5'     },
]

const IconPaperclip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
)
const IconSend = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)
const IconStop = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
)
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
)
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)
const IconFile = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
)

function CodeBlock({ language, children }: any) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl overflow-hidden my-4 border border-border bg-card max-w-full">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <span className="text-xs text-muted-foreground font-mono uppercase tracking-tight">{language || 'code'}</span>
        <button onClick={copy} className="text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded bg-muted">
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <div className="overflow-x-auto max-w-full">
        <SyntaxHighlighter
          style={oneDark as any}
          language={language || 'text'}
          PreTag="div"
          customStyle={{ margin: 0, borderRadius: 0, fontSize: '13px', background: 'transparent', maxWidth: '100%', overflowX: 'auto' }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  )
}

function AIMarkdown({ content }: any) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code({ inline, className, children }: any) {
          const match = /language-(\w+)/.exec(className || '')
          const lang = match ? match[1] : ''
          if (!inline && lang === 'chart') {
            try {
              const data = JSON.parse(String(children).trim());
              return (
                <div className="w-full h-[300px] mt-4 mb-4 bg-muted/5 text-foreground border border-border rounded-xl p-6 shadow-xl">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <XAxis dataKey="name" stroke="currentColor" className="opacity-40" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="currentColor" className="opacity-40" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(128,128,128,0.1)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            } catch (e) { return <div className="p-4 bg-destructive/10 text-destructive text-xs rounded-lg border border-destructive/20">Chart error</div> }
          }
          return !inline ? <CodeBlock language={lang}>{String(children).trim()}</CodeBlock> : <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
        },
        h1: ({ children }) => <h1 className="text-2xl font-semibold mt-6 mb-3 text-foreground tracking-tight">{children}</h1>,
        h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-2 text-foreground tracking-tight">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold mt-4 mb-1 text-foreground tracking-tight">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-7 text-foreground/90 text-[15px]">{children}</p>,
        ul: ({ children }) => <ul className="mb-3 space-y-1 pl-5">{children}</ul>,
        ol: ({ children }) => <ol className="mb-3 space-y-1 pl-5 list-decimal">{children}</ol>,
        li: ({ children }) => <li className="text-foreground/90 text-[15px] leading-7 list-disc marker:text-muted-foreground/60">{children}</li>,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-border pl-4 my-3 text-muted-foreground italic">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-4"><table className="w-full text-sm border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="text-left px-3 py-2 border border-border text-foreground/70 font-medium text-xs uppercase tracking-wide bg-muted/50">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 border border-border text-foreground/80 text-[13px]">{children}</td>,
        hr: () => <hr className="my-6 border-border" />,
        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
        em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline transition-colors">{children}</a>,
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  )
}

function FilePill({ file, onRemove }: any) {
  return (
    <div className="flex items-center gap-2 bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground/70">
      <IconFile /><span className="max-w-[120px] truncate">{file.name}</span>
      <button onClick={onRemove} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><IconX /></button>
    </div>
  )
}

export default function CleanChat() {
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id)
  const [modelOpen, setModelOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { 
    isSidebarOpen, toggleSidebar, searchEnabled, setSearchEnabled,
    activeMessages, activeChatId, setActiveChat, setActiveMessages,
    addMessage, updateLastMessage, isGenerating, setIsGenerating,
    setAbortController, stopGeneration
  } = useChatStore()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [activeMessages, isGenerating])
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  const send = async () => {
    const text = input.trim(); if (!text && files.length === 0) return; if (isGenerating) return
    let chatId = activeChatId; setInput(''); setFiles([]); setIsGenerating(true)
    if (!chatId) {
      try { const newChat = await createChat(selectedModel as any, searchEnabled); chatId = newChat._id; setActiveChat(chatId); setActiveMessages([]) }
      catch (err) { setIsGenerating(false); return }
    }
    addMessage({ _id: Date.now().toString(), conversationId: chatId, role: 'user', content: text, createdAt: new Date().toISOString() })
    addMessage({ _id: (Date.now() + 1).toString(), conversationId: chatId, role: 'assistant', content: '', createdAt: new Date().toISOString() })
    const controller = new AbortController(); setAbortController(controller)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/chats/${chatId}/send`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ content: text, useSearch: searchEnabled }),
      })
      if (!res.body) throw new Error('No body')
      const reader = res.body.getReader(); const decoder = new TextDecoder(); let assistantText = ''
      while (true) {
        const { done, value } = await reader.read(); if (done) break
        const chunk = decoder.decode(value, { stream: true })
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ')) {
            try { const data = JSON.parse(line.replace('data: ', '')); if (data.type === 'token') { assistantText += data.content; updateLastMessage(assistantText) } } catch (e) {}
          }
        }
      }
    } catch (err: any) { if (err.name !== 'AbortError') updateLastMessage('⚠️ Error: Failed to connect.') }
    finally { setIsGenerating(false); setAbortController(null) }
  }

  const handleKey = (e: any) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
  const selectedModelLabel = MODELS.find(m => m.id === selectedModel)?.label || 'Model'

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground transition-colors duration-300">
      <div className="flex-1 overflow-y-auto relative">
        <button onClick={toggleSidebar} title="Toggle Sidebar" className="fixed top-4 left-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors z-[60] md:z-50">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
        </button>
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-8 flex flex-col gap-8">
          {activeMessages.length === 0 && <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center opacity-30 tracking-tight"><div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-light">✦</div><p className="text-sm uppercase tracking-widest font-medium">Start Brainstorming</p></div>}
          {activeMessages.map((msg, i) => (
            <div key={i} className="flex flex-col gap-1">
              {msg.role === 'user' && <div className="flex justify-end"><div className="bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-4 py-3 text-[15px] leading-7 shadow-sm">{msg.content}</div></div>}
              {msg.role === 'assistant' && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground/40 mb-1 font-mono uppercase tracking-widest">assistant</span>
                  <div className="text-foreground/90">{msg.content === '' && isGenerating && i === activeMessages.length - 1 ? <TypingDots /> : <AIMarkdown content={msg.content} />}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="px-3 md:px-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-6 pt-2">
        <div className="max-w-2xl mx-auto">
          {files.length > 0 && <div className="flex flex-wrap gap-2 mb-2 px-1">{files.map((f, i) => <FilePill key={i} file={f} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />)}</div>}
          <div className="relative flex flex-col bg-muted/30 border border-border rounded-2xl overflow-hidden focus-within:border-primary/50 transition-all shadow-sm">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} placeholder="Ask anything..." rows={1} className="w-full bg-transparent text-foreground placeholder-muted-foreground/50 text-[15px] leading-7 px-4 pt-4 pb-2 resize-none outline-none min-h-[56px] max-h-[200px] custom-scrollbar" />
            <div className="flex items-center justify-between px-3 pb-3 pt-1 gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-xl text-muted-foreground hover:bg-muted transition-all"><IconPaperclip /></button>
                <input ref={fileInputRef} type="file" multiple onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files||[])].slice(0,5))} className="hidden" />
                <button onClick={() => setSearchEnabled(!searchEnabled)} className={`flex items-center gap-1.5 px-3 h-8 sm:h-10 rounded-xl text-[10px] sm:text-xs font-medium transition-all border min-w-[44px] sm:min-w-0 ${searchEnabled ? 'bg-primary/20 text-primary border-primary/20' : 'text-muted-foreground border-transparent hover:bg-muted'}`}><span className={`w-1.5 h-1.5 rounded-full ${searchEnabled ? 'bg-green-500' : 'bg-muted-foreground/30'}`} /><span className="hidden xs:inline">Web Search</span><span className="xs:hidden">Search</span></button>
                <div className="relative"><button onClick={() => setModelOpen(!modelOpen)} className="flex items-center gap-1.5 px-3 h-8 sm:h-10 rounded-xl text-muted-foreground hover:bg-muted text-[10px] sm:text-xs font-medium transition-all min-w-[44px] sm:min-w-0"><span className="truncate max-w-[60px] sm:max-w-none">{selectedModelLabel}</span><IconChevron /></button>
                {modelOpen && <div className="absolute bottom-full left-0 mb-2 w-48 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden z-50">{MODELS.map(m => <button key={m.id} onClick={() => { setSelectedModel(m.id); setModelOpen(false) }} className={`w-full text-left px-4 py-3 text-xs font-medium transition-colors hover:bg-muted ${selectedModel === m.id ? 'text-primary bg-primary/5' : 'text-muted-foreground'}`}>{m.label}</button>)}</div>}</div>
              </div>
              <div>{isGenerating ? <button onClick={stopGeneration} className="flex items-center gap-2 px-4 h-10 rounded-xl bg-muted text-foreground text-xs font-medium transition-all shadow-sm"><IconStop /><span>Stop</span></button> : <button onClick={send} disabled={!input.trim() && files.length === 0} className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 hover:scale-105 active:scale-95 transition-all shadow-md"><IconSend /></button>}</div>
            </div>
          </div>
          <p className="hidden sm:block text-center text-muted-foreground/20 text-[10px] mt-4 uppercase tracking-widest">Powered by GPT-4o & RAG</p>
        </div>
      </div>
    </div>
  )
}
