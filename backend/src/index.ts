import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import path from 'path';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import searchRoutes from './routes/search';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/search', searchRoutes);

// Uploads static files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, code: '', message: 'OK', data: null });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, code: 'not_found', message: 'Not found', data: null });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, code: 'internal_error', message: err.message, data: null });
});

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('DB sync failed:', err);
  process.exit(1);
});

export default app;
