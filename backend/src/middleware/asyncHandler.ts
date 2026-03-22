import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * 非同期ルートハンドラをラップし、発生したエラーを next() でグローバルエラーハンドラに渡す。
 * express-async-errors がカバーしない特定のケースや、明示的なラップが必要な場面で使用する。
 *
 * @param fn - ラップする非同期ルートハンドラ関数
 * @returns エラーキャッチ付きの Express ミドルウェア
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
