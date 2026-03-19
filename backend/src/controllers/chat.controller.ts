import { Request, Response } from 'express';
import { Conversation } from '../models/Conversation';
import { Message } from '../models/Message';
import { ApiResponse } from '../types/index';

// GET /api/chats — list all conversations
export const getChats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { q } = req.query;
    
    if (q && typeof q === 'string') {
      const regex = new RegExp(q, 'i');
      
      const foundMessages = await Message.find({ content: { $regex: regex } }).select('conversationId');
      const msgChatIds = foundMessages.map((m) => m.conversationId);
      
      const chats = await Conversation.find({
        $or: [
          { title: { $regex: regex } },
          { _id: { $in: msgChatIds } }
        ]
      })
      .sort({ updatedAt: -1 })
      .limit(50);
      
      res.json({ success: true, data: { chats } } as ApiResponse);
      return;
    }

    const chats = await Conversation.find({})
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json({ success: true, data: { chats } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chats' });
  }
};

// POST /api/chats — create new conversation
export const createChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { model, searchEnabled } = req.body;

    const chat = await Conversation.create({
      title: 'New Chat',
      model: model || 'gpt-4o-mini',
      searchEnabled: searchEnabled ?? false,
    });

    res.status(201).json({ success: true, data: { chat } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create chat' });
  }
};

// GET /api/chats/:id — get single conversation with messages
export const getChatById = async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Conversation.findOne({
      _id: req.params.id,
    });

    if (!chat) {
      res.status(404).json({ success: false, error: 'Chat not found' });
      return;
    }

    const messages = await Message.find({ conversationId: chat._id })
      .sort({ createdAt: 1 })
      .select('-embeddingId'); // don't expose internal vector IDs

    res.json({ success: true, data: { chat, messages } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch chat' });
  }
};

// PATCH /api/chats/:id — update title or settings
export const updateChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, model, searchEnabled, folder, systemPrompt, isPublic } = req.body;

    const chat = await Conversation.findOneAndUpdate(
      { _id: req.params.id },
      { title, model, searchEnabled, folder, systemPrompt, isPublic },
      { new: true, runValidators: true }
    );

    if (!chat) {
      res.status(404).json({ success: false, error: 'Chat not found' });
      return;
    }

    res.json({ success: true, data: { chat } } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update chat' });
  }
};

// DELETE /api/chats/:id — delete conversation + messages
export const deleteChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Conversation.findOneAndDelete({
      _id: req.params.id,
    });

    if (!chat) {
      res.status(404).json({ success: false, error: 'Chat not found' });
      return;
    }

    // Delete all messages for this conversation
    await Message.deleteMany({ conversationId: chat._id });

    res.json({ success: true, message: 'Chat deleted' } as ApiResponse);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete chat' });
  }
};

// PATCH /api/chats/:id/share — Generate a public link
export const shareChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Conversation.findOneAndUpdate(
      { _id: req.params.id },
      { isPublic: true },
      { new: true }
    );
    if (!chat) {
      res.status(404).json({ success: false, error: 'Chat not found' });
      return;
    }
    res.json({ success: true, data: { shareUrl: `/share/${chat._id}` } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to share chat' });
  }
};

// GET /api/chats/:id/public — Read-only access for shared links
export const getPublicChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const chat = await Conversation.findOne({ _id: req.params.id });

    if (!chat || !chat.isPublic) {
      res.status(404).json({ success: false, error: 'Chat not found or is private' });
      return;
    }

    const messages = await Message.find({ conversationId: chat._id })
      .sort({ createdAt: 1 })
      .select('role content sources createdAt -_id'); // limit exposed data

    res.json({ success: true, data: { chat: { title: chat.title, folder: chat.folder, createdAt: chat.createdAt }, messages } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch public chat' });
  }
};
