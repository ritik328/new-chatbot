'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Bot, Wand2, Brain, Search, Terminal, Globe, Key, 
  Palette, Type, Layout, Code2, Zap, Hash, Keyboard, Monitor,
  User, PieChart, Download, Trash2, ShieldCheck, LogOut, ChevronRight
} from 'lucide-react'
import { useChatStore } from '@/store/useChatStore'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

// ── Components ─────────────────────────────────────────────

const SettingRow = ({ icon: Icon, color, title, description, children }: any) => (
  <div className="flex items-center justify-between py-4 px-2 first:pt-2 last:pb-2 border-b border-border/50 last:border-0">
    <div className="flex items-center gap-3 pr-4">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", color)}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground leading-tight">{description}</span>
      </div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
)

const Section = ({ title, children }: any) => (
  <div className="mb-8">
    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-3 px-1">{title}</h3>
    <div className="bg-muted/30 border border-border rounded-2xl overflow-hidden px-2 shadow-sm">
      {children}
    </div>
  </div>
)

const Switch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <button
    onClick={() => onChange(!checked)}
    className={cn(
      "w-11 h-6 rounded-full transition-all duration-300 relative outline-none",
      checked ? "bg-primary" : "bg-muted-foreground/20"
    )}
  >
    <div className={cn(
      "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-all duration-300 transform shadow-md",
      checked ? "translate-x-5" : "translate-x-0"
    )} />
  </button>
)

const Dropdown = ({ value, options, onChange }: any) => (
  <select 
    value={value} 
    onChange={(e) => onChange(e.target.value)}
    className="bg-muted border border-border rounded-lg text-xs font-medium px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/40 appearance-none min-w-[100px] text-center"
  >
    {options.map((opt: any) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
)

const ActionButton = ({ onClick, label, variant = 'default' }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "text-xs font-semibold px-4 py-1.5 rounded-full transition-all active:scale-95 shadow-sm",
      variant === 'danger' ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive" : "bg-muted text-foreground hover:bg-muted-foreground/10 border border-border"
    )}
  >
    {label}
  </button>
)

// ── Main Page ─────────────────────────────────────────────

export const SettingsModal = () => {
  const { isSettingsOpen, setSettingsOpen, settings, updateSettings } = useChatStore()
  const { setTheme } = useTheme()

  if (!isSettingsOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSettingsOpen(false)}
          className="absolute inset-0 bg-background/60 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl h-[85vh] bg-card border border-border rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-8 py-6 border-b border-border shrink-0">
            <h2 className="text-xl font-bold tracking-tight">App Settings</h2>
            <button 
              onClick={() => setSettingsOpen(false)}
              className="p-2 hover:bg-muted rounded-full transition-all active:scale-90"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-2 custom-scrollbar no-scrollbar scroll-smooth">
            
            {/* ── AI BEHAVIOUR ─────────────────────────── */}
            <Section title="AI Behaviour">
              <SettingRow 
                icon={Bot} color="bg-indigo-500"
                title="Default model" description="Which model to use when starting a new chat"
              >
                <Dropdown 
                  value={settings.defaultModel} 
                  options={[
                    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
                    { value: 'gpt-4o', label: 'GPT-4o' }
                  ]}
                  onChange={(v: string) => updateSettings({ defaultModel: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Wand2} color="bg-rose-500"
                title="Response creativity" description="Precise to Creative. Balanced is recommended"
              >
                <Dropdown 
                  value={settings.creativity} 
                  options={[
                    { value: 'precise', label: 'Precise' },
                    { value: 'balanced', label: 'Balanced' },
                    { value: 'creative', label: 'Creative' }
                  ]}
                  onChange={(v: any) => updateSettings({ creativity: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Terminal} color="bg-amber-500"
                title="Response length" description="Length of AI explanations"
              >
                <Dropdown 
                  value={settings.responseLength} 
                  options={[
                    { value: 'auto', label: 'Auto' },
                    { value: 'short', label: 'Short' },
                    { value: 'long', label: 'Long' }
                  ]}
                  onChange={(v: any) => updateSettings({ responseLength: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Brain} color="bg-purple-500"
                title="Memory" description="Remember facts about you across chats"
              >
                <Switch 
                  checked={settings.memoryEnabled} 
                  onChange={(v) => updateSettings({ memoryEnabled: v })} 
                />
              </SettingRow>

              <SettingRow 
                icon={Search} color="bg-sky-500"
                title="Web search by default" description="Live internet access for every query"
              >
                <Switch 
                  checked={settings.webSearchDefault} 
                  onChange={(v) => updateSettings({ webSearchDefault: v })} 
                />
              </SettingRow>

              <SettingRow 
                icon={Globe} color="bg-indigo-600"
                title="AI language" description="Preferred response language"
              >
                <Dropdown 
                  value={settings.aiLanguage} 
                  options={[
                    { value: 'English', label: 'English' },
                    { value: 'Spanish', label: 'Spanish' },
                    { value: 'French', label: 'French' }
                  ]}
                  onChange={(v: any) => updateSettings({ aiLanguage: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Key} color="bg-yellow-500"
                title="Your API key" description="Use your own keys instead of ours"
              >
                <ActionButton label="Set key" onClick={() => {}} />
              </SettingRow>
            </Section>

            {/* ── APPEARANCE ──────────────────────────── */}
            <Section title="Appearance">
              <SettingRow 
                icon={Palette} color="bg-blue-500"
                title="Theme" description="Sync with system or choose mode"
              >
                <Dropdown 
                  value={settings.theme} 
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' }
                  ]}
                  onChange={(v: any) => { updateSettings({ theme: v }); setTheme(v) }}
                />
              </SettingRow>

              <SettingRow 
                icon={Type} color="bg-sky-400"
                title="Font size" description="Size of text in chat sessions"
              >
                <Dropdown 
                  value={settings.fontSize} 
                  options={[
                    { value: 'small', label: 'Small' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'large', label: 'Large' }
                  ]}
                  onChange={(v: any) => updateSettings({ fontSize: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Layout} color="bg-emerald-500"
                title="Message density" description="Amount of breathing room"
              >
                <Dropdown 
                  value={settings.messageDensity} 
                  options={[
                    { value: 'compact', label: 'Compact' },
                    { value: 'comfortable', label: 'Comfortable' }
                  ]}
                  onChange={(v: any) => updateSettings({ messageDensity: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Code2} color="bg-orange-500"
                title="Code block theme" description="Language coloring scheme"
              >
                <Dropdown 
                  value={settings.codeBlockTheme} 
                  options={[
                    { value: 'one-dark', label: 'One Dark' },
                    { value: 'one-light', label: 'One Light' }
                  ]}
                  onChange={(v: any) => updateSettings({ codeBlockTheme: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Zap} color="bg-cyan-500"
                title="Streaming responses" description="Show words as they generate"
              >
                <Switch 
                   checked={settings.streamingEnabled} 
                   onChange={(v) => updateSettings({ streamingEnabled: v })} 
                />
              </SettingRow>

              <SettingRow 
                icon={Hash} color="bg-blue-600"
                title="Show token count" description="Display usage below each reply"
              >
                <Switch 
                   checked={settings.showTokenCount} 
                   onChange={(v) => updateSettings({ showTokenCount: v })} 
                />
              </SettingRow>

              <SettingRow 
                icon={Keyboard} color="bg-teal-500"
                title="Enter key behaviour" description="How the Enter key works"
              >
                <Dropdown 
                  value={settings.enterKeyBehaviour} 
                  options={[
                    { value: 'send', label: 'Send' },
                    { value: 'newline', label: 'New Line' }
                  ]}
                  onChange={(v: any) => updateSettings({ enterKeyBehaviour: v })}
                />
              </SettingRow>

              <SettingRow 
                icon={Monitor} color="bg-slate-500"
                title="Chat width" description="Max width of message column"
              >
                <Dropdown 
                  value={settings.chatWidth} 
                  options={[
                    { value: '720px', label: '720px' },
                    { value: '800px', label: '800px' },
                    { value: 'full', label: 'Full' }
                  ]}
                  onChange={(v: any) => updateSettings({ chatWidth: v })}
                />
              </SettingRow>
            </Section>

            {/* ── ACCOUNT & DATA ─────────────────────── */}
            <Section title="Account & Data">
              <SettingRow 
                icon={User} color="bg-violet-500"
                title="Profile" description="Manage your account info"
              >
                <ActionButton label="Edit" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={PieChart} color="bg-teal-400"
                title="Usage stats" description="Messages & Token usage tracking"
              >
                <ActionButton label="View" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={Download} color="bg-orange-400"
                title="Export all chats" description="Download history as JSON"
              >
                <ActionButton label="Export" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={Trash2} color="bg-red-400"
                title="Clear all history" description="Delete all conversations"
              >
                <ActionButton label="Clear" variant="danger" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={ShieldCheck} color="bg-lime-500"
                title="Change password" description="Update security credentials"
              >
                <ActionButton label="Change" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={LogOut} color="bg-rose-600"
                title="Log out" description="Safely exit session"
              >
                <ActionButton label="Log out" onClick={() => {}} />
              </SettingRow>

              <SettingRow 
                icon={Trash2} color="bg-slate-800"
                title="Delete account" description="Wipe all data permanently"
              >
                <ActionButton label="Delete" variant="danger" onClick={() => {}} />
              </SettingRow>
            </Section>

          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-muted/20 border-t border-border flex items-center justify-between shrink-0">
            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">Version 1.2.0-Alpha</span>
            <button className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase tracking-widest hover:underline">
              Check for updates <ChevronRight size={10} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
