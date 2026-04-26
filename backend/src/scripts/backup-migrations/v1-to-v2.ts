/**
 * @fileoverview バックアップスキーマ v1 → v2 のデータ変換。
 *
 * v2 のスキーマ変更が確定したときにここへ実装し、
 * backup-migrations/index.ts の MIGRATIONS に登録する。
 *
 * 実装例（カラム追加）:
 *   export function v1ToV2(data: TableData): TableData {
 *     const projects = (data['projects'] ?? []).map(row => ({
 *       ...row,
 *       new_column: 0,
 *     }));
 *     return { ...data, projects };
 *   }
 *
 * 実装例（カラム名変更）:
 *   export function v1ToV2(data: TableData): TableData {
 *     const users = (data['users'] ?? []).map(({ old_name, ...rest }) => ({
 *       ...rest,
 *       new_name: old_name,
 *     }));
 *     return { ...data, users };
 *   }
 */

import type { TableData } from './index';

export function v1ToV2(_data: TableData): TableData {
  throw new Error('v1ToV2 migration is not yet implemented.');
}
