/**
 * アプリケーション共通のカスタムエラークラス。
 * エラーの種類に応じた HTTP ステータスコードとエラーコードを持つ。
 */

/**
 * アプリケーション基底エラークラス。
 * isOperational が true の場合は運用上想定されるエラー（バリデーション失敗など）、
 * false の場合はプログラムエラー（予期せぬバグ）として扱う。
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * データベース関連エラー。
 * DB 接続失敗、クエリエラー、制約違反などに使用する。
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database error occurred', code = 'database_error') {
    super(message, 500, code, true);
  }
}

/**
 * バリデーションエラー。
 * リクエストパラメータ・ボディの検証失敗時に使用する。
 */
export class ValidationError extends AppError {
  constructor(message: string, code = 'invalid_query') {
    super(message, 400, code, true);
  }
}

/**
 * 認証エラー。
 * トークン未提供・無効・期限切れ時に使用する。
 */
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'unauthorized') {
    super(message, 401, code, true);
  }
}

/**
 * 認可エラー。
 * アクセス権限が不足している場合に使用する。
 */
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', code = 'forbidden') {
    super(message, 403, code, true);
  }
}

/**
 * リソース未検出エラー。
 * 指定されたリソースが存在しない場合に使用する。
 */
export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'not_found') {
    super(message, 404, code, true);
  }
}
