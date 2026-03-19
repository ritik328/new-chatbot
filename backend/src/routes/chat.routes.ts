import { Router } from 'express';
import { getChats, createChat, getChatById, updateChat, deleteChat, shareChat, getPublicChat } from '../controllers/chat.controller';
import { sendMessage, regenerateMessage, updateMessageReaction } from '../controllers/message.controller';
import { chatLimiter } from '../middleware/rateLimit';

const router = Router();

router.get('/', getChats);
router.post('/', createChat);
router.get('/:id', getChatById);
router.patch('/:id', updateChat);
router.delete('/:id', deleteChat);

// The main message send endpoint (SSE streaming)
router.post('/:id/send', chatLimiter, sendMessage);
router.post('/:id/regenerate', chatLimiter, regenerateMessage);
router.patch('/:conversationId/messages/:messageId/reaction', updateMessageReaction);

// Public Sharing Endpoints
router.patch('/:id/share', shareChat);
router.get('/:id/public', getPublicChat);

export default router;
