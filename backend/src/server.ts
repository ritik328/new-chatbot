import 'dotenv/config';
import express from 'express';
import http from 'http';

import helmet from 'helmet';
import morgan from 'morgan';

import { connectDB } from './config/db';

import { apiLimiter } from './middleware/rateLimit';

import chatRoutes from './routes/chat.routes';
import searchRoutes from './routes/search.routes';
import cleanChatRoutes from './routes/clean-chat.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import { ensureQdrantCollection } from './services/qdrant.service';

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet());

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api', apiLimiter);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/chats', chatRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/chat', cleanChatRoutes);
app.use('/api/knowledge', knowledgeRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async () => {
  await connectDB();
  await ensureQdrantCollection();



  server.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV}`);
  });
};

start();

export { app, server };
