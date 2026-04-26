/**
 * @fileoverview DBバックアップスクリプト。
 *
 * 全テーブルのデータを JSON 形式で書き出す。
 * スキーマ定義（DDL）は含まず、行データのみをバックアップする。
 *
 * Usage:
 *   npm run backup                     # ./backups/ に保存
 *   npm run backup -- --out=/path/dir  # 保存先を指定
 */

import path from 'path';
import fs from 'fs';
import { sequelize } from '../models';
import { CURRENT_SCHEMA_VERSION } from './backup-migrations';

/**
 * FK依存関係を考慮したテーブル挿入順序。
 * バックアップはこの順で読み取り、リストアもこの順で挿入する。
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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const outArg = args.find(a => a.startsWith('--out='));
  const outDir = outArg
    ? outArg.split('=').slice(1).join('=')
    : path.join(__dirname, '..', '..', 'backups');

  await sequelize.authenticate();
  console.log('Connected to database.\n');

  const tables: Record<string, unknown[]> = {};
  let totalRows = 0;

  for (const table of TABLE_ORDER) {
    const [rows] = await sequelize.query(`SELECT * FROM "${table}"`);
    tables[table] = rows as unknown[];
    totalRows += (rows as unknown[]).length;
    console.log(`  ${table}: ${(rows as unknown[]).length} rows`);
  }

  const now = new Date();
  const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `backup_${ts}.json`;

  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, fileName);

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pkg = require('../../package.json') as { version: string };

  const payload = {
    meta: {
      appVersion: pkg.version,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: now.toISOString(),
      dialect: sequelize.getDialect(),
    },
    tables,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');
  console.log(`\nTotal: ${totalRows} rows`);
  console.log(`Backup saved to: ${outPath}`);

  await sequelize.close();
}

main().catch(err => {
  console.error('Backup failed:', err);
  process.exit(1);
});
