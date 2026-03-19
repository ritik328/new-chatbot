import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { Project, IProject } from '../models/Project';
import { streamChatCompletion, generateChatTitle } from '../services/openai.service';
import { smartSearch } from '../services/search.service';
import { extractAndStoreMemories, getUserMemoriesString } from '../services/memory.service';
import { queryKnowledgeBase } from '../services/qdrant.service';
import { ChatMessage } from '../types/index';

// POST /api/chats/:id/send
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { content, useSearch: bodySearch } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Message content required' });
      return;
    }

    const conversation = await Conversation.findOne({ _id: conversationId });
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // ── 0. Fetch Project Settings ───────────────────────────────────────────
    let project: any = null;
    if (conversation.projectId) {
      project = await Project.findById(conversation.projectId);
    }

    const finalModel = project?.aiModel || conversation.aiModel || 'gpt-4o-mini';
    const finalSystemPrompt = project?.systemPrompt || conversation.systemPrompt;
    const finalUseSearch = bodySearch || project?.webSearch || conversation.searchEnabled;
    const projectCollection = project?.files?.[0]?.qdrantCollection;

    // ── 1. Save user message ─────────────────────────────────────────────────
    const userMessage = await Message.create({
      conversationId,
      role: 'user',
      content: content.trim(),
    });

    extractAndStoreMemories('default_user', content.trim());

    if (conversation.messageCount === 0) {
      const title = await generateChatTitle(content);
      await Conversation.findByIdAndUpdate(conversationId, { title });
    }

    // ── 2. Search & Context ─────────────────────────────────────────────────
    let sources: any[] = [];
    let searchContext = '';

    if (finalUseSearch) {
      const { contextString, sources: searchSources } = await smartSearch(content, 3);
      searchContext = contextString;
      sources = searchSources;
    }

    const memoryContext = await getUserMemoriesString('default_user');
    const ragContext = await queryKnowledgeBase(projectCollection || conversationId, content, 3);
    
    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const timeContext = `Current Date: ${dateString}\nCurrent Time: ${timeString}\nReal-time Search: ${finalUseSearch ? 'ENABLED' : 'DISABLED'}`;

    let combinedSystemContext = `${timeContext}\n\n${memoryContext}`;
    if (searchContext) combinedSystemContext += `\n\n--- WEB SEARCH RESULTS ---\n${searchContext}`;
    if (ragContext) {
      combinedSystemContext += `\n\n--- PROJECT KNOWLEDGE BASE ---\n${ragContext}`;
    }
    combinedSystemContext = combinedSystemContext.trim();

    // ── 3. Load chat history ────────────────────────────────────────────────
    const recentMessages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const chatHistory: ChatMessage[] = recentMessages
      .reverse()
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // ── 4. Stream response via SSE ───────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
    res.flushHeaders();

    let fullAssistantText = '';

    await streamChatCompletion(
      chatHistory,
      finalModel,
      searchContext,
      (token) => {
        fullAssistantText += token;
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      },
      async (completeText) => {
        await Message.create({
          conversationId,
          role: 'assistant',
          content: completeText,
        });
        await Conversation.findByIdAndUpdate(conversationId, {
          $inc: { messageCount: 2 },
          updatedAt: new Date(),
        });
        res.write(`data: ${JSON.stringify({ type: 'done', sources })}\n\n`);
        res.end();
      },
      finalSystemPrompt
    );

  } catch (error: any) {
    console.error('SendMessage Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', content: 'Connection lost' })}\n\n`);
      res.end();
    }
  }
};

export const updateMessageReaction = async (req: Request, res: Response) => {
  try {
    const { id: conversationId, messageId } = req.params;
    const { reaction } = req.body;

    if (!['upvote', 'downvote', null].includes(reaction)) {
      return res.status(400).json({ success: false, error: 'Invalid reaction' });
    }

    const message = await Message.findOneAndUpdate(
      { _id: messageId, conversationId },
      { reaction },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ success: false, error: 'Message not found' });
    }

    res.json({ success: true, data: { message } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
