import express, { Router, Response, Request } from 'express';
import { smartSearch } from '../services/search.service';

const router = express.Router();

// POST /api/search — manual search endpoint (for UI search suggestions)
router.post('/', async (req: Request, res: Response) => {
  const { query, count } = req.body;
  if (!query) {
    return res.status(400).json({ success: false, error: 'Query required' });
  }

  try {
    const limit = count ? parseInt(count as string, 10) : 5;
    const data = await smartSearch(query as string, limit);
    return res.json({ success: true, data: data });
  } catch (error) {
    console.error('Search error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
