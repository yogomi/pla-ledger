import 'express-async-errors';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import searchRoutes from './routes/search';
import { authRateLimiter, apiRateLimiter } from './middleware/rateLimiter';
import { globalErrorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRateLimiter, authRoutes);
app.use('/api/projects', apiRateLimiter, projectRoutes);
app.use('/api/search', apiRateLimiter, searchRoutes);

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

// グローバルエラーハンドラ（すべての未処理エラーをキャッチ）
app.use(globalErrorHandler);

// ==============================
// DB 接続確認・サーバー起動
// ==============================

let server: http.Server;

/**
 * graceful shutdown: 新規リクエストを停止し、既存リクエスト完了後にプロセスを終了する。
 *
 * @param signal - 受信したシグナル名
 */
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed. Closing database connection...');
    try {
      await sequelize.close();
      logger.info('Database connection closed. Process exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing database connection', {
        message: (err as Error).message,
        stack: (err as Error).stack,
      });
      process.exit(1);
    }
  });

  // タイムアウト: 30 秒以内に完了しない場合は強制終了
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 30000).unref();
}

// ==============================
// プロセスレベルのエラーハンドリング
// ==============================

/**
 * 未捕捉の同期例外をログに記録し、graceful shutdown を実行する。
 */
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception detected', {
    message: err.message,
    stack: err.stack,
  });
  gracefulShutdown('uncaughtException').catch(() => process.exit(1));
});

/**
 * 未処理の Promise rejection をログに記録し、graceful shutdown を実行する。
 */
process.on('unhandledRejection', (reason: unknown) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled promise rejection detected', {
    message: err.message,
    stack: err.stack,
  });
  gracefulShutdown('unhandledRejection').catch(() => process.exit(1));
});

/**
 * SIGTERM シグナル受信時の graceful shutdown（コンテナ・プロセスマネージャーからの終了要求）。
 */
process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM').catch(() => process.exit(1));
});

/**
 * SIGINT シグナル受信時の graceful shutdown（Ctrl+C などの手動終了）。
 */
process.on('SIGINT', () => {
  gracefulShutdown('SIGINT').catch(() => process.exit(1));
});

// ==============================
// 起動処理
// ==============================

(async () => {
  try {
    // DB 接続確認
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // 開発環境のみ DB スキーマを同期
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync();
      logger.info('Database schema synchronized.');
    }

    server = app.listen(PORT, () => {
      logger.info(`Backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', {
      message: (err as Error).message,
      stack: (err as Error).stack,
    });
    process.exit(1);
  }
})();

export default app;
