import { Request, Response } from 'express';
import { Message } from '../models/Message';
import { Conversation } from '../models/Conversation';
import { streamChatCompletion, generateChatTitle } from '../services/openai.service';
import { smartSearch } from '../services/search.service';
import { extractAndStoreMemories, getUserMemoriesString } from '../services/memory.service';
import { queryKnowledgeBase } from '../services/qdrant.service';

import { ChatMessage } from '../types/index';

// POST /api/chats/:id/send
// This is the core endpoint — handles the full pipeline:
// user message → search (optional) → memory → OpenAI stream → save
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;
    const { content, useSearch } = req.body;

    if (!content?.trim()) {
      res.status(400).json({ success: false, error: 'Message content required' });
      return;
    }

    // Verify conversation exists
    const conversation = await Conversation.findOne({ _id: conversationId });
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // ── 1. Save user message ─────────────────────────────────────────────────
    const userMessage = await Message.create({
      conversationId,
      role: 'user',
      content: content.trim(),
    });

    // Fire & Forget: Background thread extracts and memorizes facts silently
    // Temporarily using 'default_user' since auth is not yet implemented
    extractAndStoreMemories('default_user', content.trim());

    // Auto-title the chat on first message
    if (conversation.messageCount === 0) {
      const title = await generateChatTitle(content);
      await Conversation.findByIdAndUpdate(conversationId, { title });
    }

    // ── 2. Serpstack Search (optional) ───────────────────────────────────────
    let sources: { title: string; url: string; description: string }[] = [];
    let searchContext = '';

    const autoSearchKeywords = ['latest', 'new', 'update', 'current', 'today', 'now', '2025', '2026', 'recent', 'news'];
    const shouldAutoSearch = autoSearchKeywords.some(w => content.toLowerCase().includes(w));
    const finalUseSearch = useSearch || shouldAutoSearch;

    // Optional: Web Search via Smart Router
    if (finalUseSearch) {
      const { contextString, sources: searchSources } = await smartSearch(content, 3);
      searchContext = contextString;
      sources = searchSources;
    }

    // ── 3. Context Retrieval (Memory, Web, RAG) ─────────────────────────
    const memoryContext = await getUserMemoriesString('default_user');
    const ragContext = await queryKnowledgeBase(conversationId, content, 3);
    
    let combinedSystemContext = memoryContext;
    if (searchContext) combinedSystemContext += `\n\n${searchContext}`;
    if (ragContext) {
      combinedSystemContext += `\n\n--- DOCUMENT KNOWLEDGE BASE ---\n${ragContext}\n\nUse this information from the uploaded project documents to answer the question. Cite source filenames.`;
    }
    combinedSystemContext = combinedSystemContext.trim();


    // ── 4. Load last N messages for context window ───────────────────────────
    const recentMessages = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const chatHistory: ChatMessage[] = recentMessages
      .reverse()
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // ── 5. Stream response via SSE ───────────────────────────────────────────
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || '*');
    res.flushHeaders();

    let fullAssistantText = '';

    await streamChatCompletion(
      chatHistory,
      conversation.aiModel,
      combinedSystemContext,
      // onToken: send each token as SSE event
      (token: string) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      },
      // onComplete: save final message
      async (fullText: string) => {
        fullAssistantText = fullText;
      },
      conversation.systemPrompt
    );

    // ── 6. Save assistant message to DB ──────────────────────────────────────
    const assistantMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: fullAssistantText,
      sources,
    });

    // ── 7. Update conversation metadata ──────────────────────────────────────
    await Conversation.findByIdAndUpdate(conversationId, {
      $inc: { messageCount: 2 },
      updatedAt: new Date(),
    });



    // ── 9. Send final SSE event with message metadata ─────────────────────────
    res.write(
      `data: ${JSON.stringify({
        type: 'done',
        messageId: assistantMessage.id,
        sources,
      })}\n\n`
    );

    res.end();

  } catch (error) {
    console.error('sendMessage error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to send message' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
};

// POST /api/chats/:id/regenerate
export const regenerateMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id: conversationId } = req.params;

    const conversation = await Conversation.findOne({ _id: conversationId });
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    const recentMessagesDB = await Message.find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    if (recentMessagesDB.length === 0) {
      res.status(400).json({ success: false, error: 'No messages to regenerate' });
      return;
    }

    let lastMessage = recentMessagesDB[0];
    if (lastMessage.role === 'assistant') {
      await Message.findByIdAndDelete(lastMessage._id);
      recentMessagesDB.shift();
    }

    const newLastMessage = recentMessagesDB[0];
    const content = newLastMessage?.content || '';

    let sources: { title: string; url: string; description: string }[] = [];
    let searchContext = '';

    const autoSearchKeywords = ['latest', 'new', 'update', 'current', 'today', 'now', '2025', '2026', 'recent', 'news'];
    const shouldAutoSearch = autoSearchKeywords.some(w => content.toLowerCase().includes(w));
    const finalUseSearch = conversation.searchEnabled || shouldAutoSearch;

    if (finalUseSearch && content) {
      const searchResult = await smartSearch(content, 3);
      sources = searchResult.sources;
      searchContext = searchResult.contextString;
    }

    const memoryContext = await getUserMemoriesString('default_user');
    const ragContext = await queryKnowledgeBase(conversationId, content, 3);
    
    let combinedSystemContext = memoryContext;
    if (searchContext) combinedSystemContext += `\n\n${searchContext}`;
    if (ragContext) {
       combinedSystemContext += `\n\n--- DOCUMENT KNOWLEDGE BASE ---\n${ragContext}\n\nUse this information from the uploaded project documents to answer the question. Cite source filenames.`;
    }
    combinedSystemContext = combinedSystemContext.trim();

    const chatHistory: ChatMessage[] = recentMessagesDB
      .reverse()
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullAssistantText = '';

    await streamChatCompletion(
      chatHistory,
      conversation.aiModel,
      combinedSystemContext,
      (token: string) => {
        res.write(`data: ${JSON.stringify({ type: 'token', content: token })}\n\n`);
      },
      async (fullText: string) => {
        fullAssistantText = fullText;
      },
      conversation.systemPrompt
    );

    const assistantMessage = await Message.create({
      conversationId,
      role: 'assistant',
      content: fullAssistantText,
      sources,
    });

    res.write(`data: ${JSON.stringify({ type: 'done', messageId: assistantMessage.id, sources })}\n\n`);
    res.end();
  } catch (error) {
    console.error('regenerateMessage error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Failed to regenerate message' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: 'Stream failed' })}\n\n`);
      res.end();
    }
  }
};

// PATCH /api/chats/:conversationId/messages/:messageId/reaction
export const updateMessageReaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { reaction } = req.body;
    
    if (reaction !== 'upvote' && reaction !== 'downvote' && reaction !== null) {
      res.status(400).json({ success: false, error: 'Invalid reaction' });
      return;
    }
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { reaction },
      { new: true }
    );
    
    if (!message) {
      res.status(404).json({ success: false, error: 'Message not found' });
      return;
    }
    
    res.json({ success: true, data: { message } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update reaction' });
  }
};
