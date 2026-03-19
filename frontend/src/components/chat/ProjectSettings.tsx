'use client';

import { useState } from 'react';
import { X, Upload, Share2, Brain, Check, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useChatStore } from '@/store/useChatStore';
import { updateChat, shareChat as shareChatApi, uploadKnowledgeBaseFile } from '@/lib/api';
import { IConversation } from '@/types';

interface ProjectSettingsProps {
  chat: IConversation;
  onClose: () => void;
}

export const ProjectSettings = ({ chat, onClose }: ProjectSettingsProps) => {
  const { chats, setChats } = useChatStore();
  
  // Custom Persona
  const [systemPrompt, setSystemPrompt] = useState(chat.systemPrompt || '');
  const [isSavingPersona, setIsSavingPersona] = useState(false);
  
  // RAG / Knowledge Base
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  // Public Sharing
  const [isPublic, setIsPublic] = useState(chat.isPublic || false);
  const [shareUrl, setShareUrl] = useState('');
  const [isCopying, setIsCopying] = useState(false);

  // 1. Save Persona
  const handleSavePersona = async () => {
    setIsSavingPersona(true);
    try {
      const updated = await updateChat(chat._id, { systemPrompt });
      setChats(chats.map(c => c._id === chat._id ? { ...c, systemPrompt: updated.systemPrompt } : c));
      alert('Custom AI Persona saved!');
    } catch (e) {
      alert('Failed to save persona.');
    } finally {
      setIsSavingPersona(false);
    }
  };

  // 2. Handle Document Upload (RAG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    try {
      const result = await uploadKnowledgeBaseFile(chat._id, file);
      setUploadStatus({ 
        type: 'success', 
        msg: `Successfully embedded "${result.filename}" (${result.chunks} chunks).` 
      });
    } catch (e) {
      setUploadStatus({ type: 'error', msg: 'Document processing failed.' });
    } finally {
      setIsUploading(false);
    }
  };

  // 3. Generate & Copy Share Link
  const handleShare = async () => {
    try {
      const url = await shareChatApi(chat._id);
      const fullUrl = `${window.location.origin}${url}`;
      setShareUrl(fullUrl);
      setIsPublic(true);
      await navigator.clipboard.writeText(fullUrl);
      setIsCopying(true);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (e) {
      alert('Failed to share chat.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-xl">
              <Brain className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Project Intelligence Settings</h3>
              <p className="text-xs text-white/40">{chat.title}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10 rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Section 1: Custom Persona */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-emerald-400" />
              <label className="text-sm font-medium text-white/80">Custom AI Persona & Context</label>
            </div>
            <p className="text-xs text-white/40">Give the AI a specific personality or set permanent rules for this project.</p>
            <Textarea 
              placeholder="e.g. You are a senior React developer. Always answer in short, technical sentences and prioritize security."
              className="min-h-[120px] bg-white/5 border-white/10 rounded-2xl p-4 text-sm resize-none"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <Button 
                onClick={handleSavePersona} 
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-11"
                disabled={isSavingPersona}
            >
              {isSavingPersona ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Apply AI Persona'}
            </Button>
          </section>

          {/* Section 2: Knowledge Base (RAG) */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-blue-400" />
              <label className="text-sm font-medium text-white/80">Project Knowledge Base (RAG)</label>
            </div>
            <p className="text-xs text-white/40">Upload PDFs or Markdown files. The AI will store them in Qdrant and only answer based on these documents when relevant.</p>
            
            <div className="relative group">
              <input 
                type="file" 
                accept=".pdf,.md,.txt" 
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="w-full h-24 border-2 border-dashed border-white/10 hover:border-blue-500/50 rounded-2xl flex flex-col items-center justify-center gap-2 bg-white/[0.02] transition-colors group-hover:bg-white/[0.04]">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                ) : (
                  <Upload className="h-6 w-6 text-white/30 group-hover:text-blue-400 transition-colors" />
                )}
                <span className="text-xs text-white/40 tracking-wide font-medium">Click to upload or drag & drop (PDF, MD, TXT)</span>
              </div>
            </div>

            {uploadStatus && (
              <div className={`p-3 rounded-xl flex items-center gap-3 border text-xs ${
                uploadStatus.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {uploadStatus.type === 'success' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                {uploadStatus.msg}
              </div>
            )}
          </section>

          {/* Section 3: Share Link */}
          <section className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-purple-400" />
              <label className="text-sm font-medium text-white/80">Share Project History</label>
            </div>
            <p className="text-xs text-white/40">Construct a live, read-only link. Anyone with this URL can view your chat history.</p>
            <Button 
                onClick={handleShare}
                variant="outline"
                className="w-full bg-white/5 border-white/10 text-white rounded-xl h-11 hover:bg-white/10 hover:border-purple-500/30 group"
            >
               {isCopying ? (
                 <><Check className="h-4 w-4 mr-2 text-emerald-400" /> Copied Link!</>
               ) : (
                 <><Copy className="h-4 w-4 mr-2 group-hover:text-purple-400 transition-colors" /> Generate & Copy Share Link</>
               )}
            </Button>
            {isPublic && (
                <p className="text-[10px] text-emerald-500/60 text-center font-mono uppercase tracking-tighter">Public access is active for this project.</p>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};
