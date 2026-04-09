import { Request, Response, NextFunction } from 'express';
import {
  ValidationError as SequelizeValidationError,
  UniqueConstraintError,
  DatabaseError as SequelizeDatabaseError,
  ConnectionError,
  TimeoutError,
} from 'sequelize';
import logger from '../utils/logger';
import { AppError } from '../utils/errors';

/**
 * Sequelize エラーを AppError に変換する。
 *
 * @param err - Sequelize 固有のエラーオブジェクト
 * @returns 変換後の AppError
 */
function handleSequelizeError(
  err: SequelizeDatabaseError | ConnectionError | TimeoutError,
): AppError {
  if (err instanceof UniqueConstraintError) {
    const fields = Object.keys(err.fields).join(', ');
    return new AppError(
      `Duplicate entry: ${fields}`,
      409,
      'duplicate_entry',
      true,
    );
  }

  if (err instanceof SequelizeValidationError) {
    const messages = err.errors.map(e => e.message).join(', ');
    return new AppError(messages, 400, 'invalid_query', true);
  }

  if (err instanceof ConnectionError) {
    return new AppError('Database connection error', 503, 'database_connection_error', true);
  }

  if (err instanceof TimeoutError) {
    return new AppError('Database operation timed out', 503, 'database_timeout', true);
  }

  return new AppError('Database error occurred', 500, 'database_error', true);
}

/**
 * グローバルエラーハンドラミドルウェア。
 * すべての未処理エラーをキャッチし、適切な HTTP レスポンスを返す。
 *
 * - 運用エラー（AppError）: 定義された statusCode・code でレスポンスを返す。
 * - プログラムエラー: ログに詳細を記録し、一般的な 500 エラーを返す。
 * - Sequelize エラー: 種類に応じて適切な AppError に変換して処理する。
 *
 * @param err - 捕捉されたエラーオブジェクト
 * @param req - Express リクエストオブジェクト
 * @param res - Express レスポンスオブジェクト
 * @param _next - Express next 関数（未使用だがシグネチャに必要）
 */
export function globalErrorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Sequelize 固有のエラーを AppError に変換
  let error: AppError | Error = err;

  if (
    err instanceof SequelizeDatabaseError ||
    err instanceof ConnectionError ||
    err instanceof TimeoutError
  ) {
    // 元の SQL エラー詳細をログに残す（原因調査のため）
    logger.error('Sequelize error detail', {
      name: err.name,
      message: err.message,
      sql: (err as SequelizeDatabaseError).sql ?? null,
      path: req.path,
      method: req.method,
    });
    error = handleSequelizeError(err as SequelizeDatabaseError);
  }

  // AppError（運用エラー）の場合
  if (error instanceof AppError && error.isOperational) {
    logger.warn('Operational error', {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      path: req.path,
      method: req.method,
    });

    res.status(error.statusCode).json({
      success: false,
      code: error.code,
      message: error.message,
      data: null,
    });
    return;
  }

  // プログラムエラーの場合：詳細をログに記録し、一般的なエラーメッセージを返す
  logger.error('Unexpected error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
    userId: (req as Request & { user?: { id: string } }).user?.id,
  });

  res.status(500).json({
    success: false,
    code: 'internal_error',
    message: 'An unexpected error occurred',
    data: null,
  });
}
