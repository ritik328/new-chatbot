import { Router } from 'express';
import { upload, uploadProjectDocument } from '../controllers/knowledge.controller';
import { chatLimiter } from '../middleware/rateLimit';

const router = Router();

// POST /api/knowledge/upload/:conversationId
// Securely upload a PDF or MD file to build an isolated project Vector DB
router.post('/upload/:conversationId', chatLimiter, upload.single('document'), uploadProjectDocument);

export default router;
