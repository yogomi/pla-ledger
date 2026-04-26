/**
 * @fileoverview DBリストアスクリプト。
 *
 * バックアップ JSON を読み込み、既存データを全削除してから挿入する（完全置換）。
 * スキーマ（テーブル定義・SequelizeMeta）は変更しない。
 * バックアップのスキーマバージョンが現在より古い場合は、
 * backup-migrations のマイグレーション関数を順次適用して変換する。
 *
 * Usage:
 *   npm run restore -- --file=./backups/backup_2026-04-26T12-00-00.json
 *   npm run restore -- --file=./backups/backup_xxx.json --dry-run
 */

import path from 'path';
import fs from 'fs';
import { Transaction } from 'sequelize';
import { sequelize } from '../models';
import { applyMigrations, CURRENT_SCHEMA_VERSION, TableData } from './backup-migrations';

/**
 * FK依存関係を考慮したテーブル挿入順序。
 * クリアは逆順、挿入はこの順で行う。
 */
const TABLE_ORDER = [
  'users',
  'password_reset_tokens',
  'projects',
  'permissions',
  'access_requests',
  'project_sections',
  'project_versions',
  'comments',
  'activity_logs',
  'sales_simulation_snapshots',
  'fixed_expenses',
  'fixed_expense_months',
  'loans',
  'loan_repayments',
  'labor_costs',
  'labor_cost_months',
  'cash_flow_monthly',
  'fixed_assets',
  'fixed_asset_depreciation_schedules',
  'startup_costs',
];

// SQLite はバインド変数の上限があるため、行数の多いテーブルは分割して挿入する
const SQLITE_CHUNK_SIZE = 100;

interface BackupMeta {
  appVersion: string;
  schemaVersion: number;
  createdAt: string;
  dialect: string;
}

interface BackupFile {
  meta: BackupMeta;
  tables: TableData;
}

/**
 * テーブルへ行を挿入する。SQLite の場合は CHUNK_SIZE ごとに分割する。
 */
async function insertRows(
  table: string,
  rows: Record<string, unknown>[],
  transaction: Transaction,
  dialect: string,
): Promise<void> {
  if (rows.length === 0) return;
  const qi = sequelize.getQueryInterface();
  const chunkSize = dialect === 'sqlite' ? SQLITE_CHUNK_SIZE : rows.length;
  for (let i = 0; i < rows.length; i += chunkSize) {
    await qi.bulkInsert(table, rows.slice(i, i + chunkSize), { transaction });
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = args.find(a => a.startsWith('--file='));
  const dryRun = args.includes('--dry-run');

  if (!fileArg) {
    console.error('Usage: npm run restore -- --file=<path> [--dry-run]');
    process.exit(1);
  }

  const filePath = fileArg.split('=').slice(1).join('=');
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const backup = JSON.parse(raw) as BackupFile;
  const { meta, tables } = backup;

  console.log('Backup info:');
  console.log(`  File       : ${absolutePath}`);
  console.log(`  Created    : ${meta.createdAt}`);
  console.log(`  App ver    : ${meta.appVersion}`);
  console.log(`  Schema ver : ${meta.schemaVersion} → current: ${CURRENT_SCHEMA_VERSION}`);
  console.log('');

  if (meta.schemaVersion > CURRENT_SCHEMA_VERSION) {
    console.error(
      `Cannot restore: backup schemaVersion (${meta.schemaVersion}) is newer than ` +
      `current (${CURRENT_SCHEMA_VERSION}). Please upgrade the application first.`,
    );
    process.exit(1);
  }

  // バージョン差分マイグレーション
  let data = tables;
  if (meta.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const steps = CURRENT_SCHEMA_VERSION - meta.schemaVersion;
    console.log(`Applying ${steps} backup migration(s)...`);
    data = applyMigrations(data, meta.schemaVersion, CURRENT_SCHEMA_VERSION);
    console.log('Migration complete.\n');
  }

  if (dryRun) {
    const totalRows = TABLE_ORDER.reduce((sum, t) => sum + (data[t]?.length ?? 0), 0);
    console.log(`[dry-run] Validation passed. ${totalRows} rows would be restored.`);
    return;
  }

  await sequelize.authenticate();
  console.log('Connected to database.');

  const dialect = sequelize.getDialect();
  const transaction = await sequelize.transaction();

  try {
    // SQLite は FK チェックをトランザクション外で制御する必要がある
    if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = OFF;');
    }

    // 逆順でデータを全削除（FK依存の逆順）
    console.log('\nClearing existing data...');
    for (const table of [...TABLE_ORDER].reverse()) {
      await sequelize.query(`DELETE FROM "${table}";`, { transaction });
    }

    // 依存順に挿入
    console.log('\nRestoring data...');
    let totalRows = 0;
    for (const table of TABLE_ORDER) {
      const rows = (data[table] ?? []) as Record<string, unknown>[];
      await insertRows(table, rows, transaction, dialect);
      totalRows += rows.length;
      console.log(`  ${table}: ${rows.length} rows`);
    }

    await transaction.commit();

    if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = ON;');
    }

    console.log(`\nTotal: ${totalRows} rows restored.`);
    console.log('Restore completed successfully.');
  } catch (err) {
    await transaction.rollback();
    if (dialect === 'sqlite') {
      await sequelize.query('PRAGMA foreign_keys = ON;');
    }
    throw err;
  }

  await sequelize.close();
}

main().catch(err => {
  console.error('Restore failed:', err);
  process.exit(1);
});
