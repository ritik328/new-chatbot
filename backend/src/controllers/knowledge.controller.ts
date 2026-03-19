import { Request, Response } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { Conversation } from '../models/Conversation';
import { storeKnowledgeBaseDocument } from '../services/qdrant.service';

export const upload = multer({ storage: multer.memoryStorage() });

export const uploadProjectDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }

    // Verify Project Exists
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      res.status(404).json({ success: false, error: 'Project / Conversation not found' });
      return;
    }

    let rawText = '';

    if (file.mimetype === 'application/pdf') {
       try {
         const pdfData = await pdfParse(file.buffer);
         rawText = pdfData.text;
       } catch (pdfErr) {
         res.status(400).json({ success: false, error: 'Failed to extract text from PDF document.' });
         return;
       }
    } else if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown' || file.originalname.endsWith('.md')) {
      rawText = file.buffer.toString('utf-8');
    } else {
      res.status(400).json({ success: false, error: 'Unsupported file type. Please upload a PDF, TXT, or MD file.' });
      return;
    }

    if (!rawText || !rawText.trim()) {
      res.status(400).json({ success: false, error: 'Document is empty or unreadable' });
      return;
    }

    // Embed and Store in isolated Qdrant memory 
    const chunkCount = await storeKnowledgeBaseDocument(conversationId, file.originalname, rawText);

    res.status(200).json({
      success: true,
      data: {
        message: `Successfully isolated and embedded ${chunkCount} chunks into Project Knowledge Base`,
        filename: file.originalname,
        chunks: chunkCount
      }
    });

  } catch (error: any) {
    console.error('Upload Knowledge Base Error:', error);
    res.status(500).json({ success: false, error: 'Failed to process document into vector database' });
  }
};
