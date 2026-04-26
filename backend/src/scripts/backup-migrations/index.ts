/**
 * @fileoverview バックアップのスキーマバージョン管理モジュール。
 *
 * スキーマ変更を行った際は以下の手順を踏む：
 *   1. CURRENT_SCHEMA_VERSION をインクリメントする
 *   2. v{N}-to-v{N+1}.ts を作成し、データ変換ロジックを実装する
 *   3. MIGRATIONS に追加する
 *
 * マイグレーション関数は「旧バージョンのテーブルデータ」を受け取り、
 * 「新バージョンのテーブルデータ」を返す純粋関数として実装すること。
 */

// ---- バージョン定義 ----
// v1: 初期スキーマ（20260410000000-create-initial-schema）

/** アプリが現在期待するバックアップのスキーマバージョン */
export const CURRENT_SCHEMA_VERSION = 1;

// ---- 型定義 ----

/** テーブル名 → 行データの配列 */
export type TableData = Record<string, Record<string, unknown>[]>;

/** バージョン N → N+1 を変換する関数 */
type MigrationFn = (data: TableData) => TableData;

// ---- マイグレーション関数マップ ----
// キー: 変換元バージョン番号（N → N+1）
// 例: スキーマ v1 → v2 の関数は { 1: v1ToV2 }

const MIGRATIONS: Record<number, MigrationFn> = {
  // 1: v1ToV2,  // v2 確定時に有効化し、v1-to-v2.ts に実装する
};

// ---- エクスポート ----

/**
 * fromVersion から toVersion まで順次マイグレーションを適用する。
 *
 * @param data - 変換元のテーブルデータ
 * @param fromVersion - バックアップのスキーマバージョン
 * @param toVersion - 現在のスキーマバージョン（CURRENT_SCHEMA_VERSION）
 * @returns 変換後のテーブルデータ
 * @throws fromVersion < toVersion の区間にマイグレーション関数が未定義の場合
 */
export function applyMigrations(
  data: TableData,
  fromVersion: number,
  toVersion: number,
): TableData {
  let current = data;
  for (let v = fromVersion; v < toVersion; v++) {
    const fn = MIGRATIONS[v];
    if (!fn) {
      throw new Error(
        `No backup migration defined for schemaVersion ${v} → ${v + 1}. ` +
        `Implement the conversion in backup-migrations/v${v}-to-v${v + 1}.ts ` +
        `and register it in backup-migrations/index.ts.`,
      );
    }
    console.log(`  Applying migration v${v} → v${v + 1}...`);
    current = fn(current);
  }
  return current;
}
