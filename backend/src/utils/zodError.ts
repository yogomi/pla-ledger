import { ZodError } from 'zod';

/**
 * ZodError のエラー配列からフィールドパス付きのエラーメッセージ文字列を生成する。
 *
 * 例:
 *   path が ['title'] の場合  → "title: Expected string, received null"
 *   path が ['sections', 0, 'type'] の場合 → "sections[0].type: Expected string, received null"
 *   path が [] の場合 → そのままメッセージを使用
 *
 * @param error - Zod バリデーションエラー
 * @returns カンマ区切りのエラーメッセージ文字列
 */
export function formatZodError(error: ZodError): string {
  return error.errors.map(e => {
    if (e.path.length === 0) return e.message;
    const path = buildPath(e.path);
    return `${path}: ${e.message}`;
  }).join(', ');
}

/**
 * Zod のエラーパス配列を "fieldName[0].nested" 形式の文字列に変換する。
 */
function buildPath(segments: (string | number)[]): string {
  let result = '';
  for (const segment of segments) {
    if (typeof segment === 'number') {
      result += `[${segment}]`;
    } else if (result === '') {
      result = segment;
    } else {
      result += `.${segment}`;
    }
  }
  return result;
}
