/**
 * @fileoverview sequelize-cli 用データベース設定ファイル。
 *
 * 環境ごと（development / production / test）の接続設定を定義する。
 * sequelize-cli はビルド後の dist/config/database.js を参照する（.sequelizerc 参照）。
 *
 * @module config/database
 */

/** データベース接続設定の型定義 */
interface DatabaseConfig {
  /** SQLite ファイルパス（SQLite 使用時のみ） */
  storage?: string;
  /** 接続 URL を格納した環境変数名（use_env_variable 使用時） */
  use_env_variable?: string;
  /** データベース方言（sqlite / postgres） */
  dialect: 'sqlite' | 'postgres';
  /** SQL ログ出力の有無 */
  logging: boolean;
  /** PostgreSQL 接続オプション（SSL 等） */
  dialectOptions?: Record<string, unknown>;
}

/** 環境別データベース設定マップ */
interface DatabaseConfigMap {
  development: DatabaseConfig;
  production: DatabaseConfig;
  test: DatabaseConfig;
}

const config: DatabaseConfigMap = {
  /** 開発環境: SQLite ファイルを使用 */
  development: {
    dialect: 'sqlite',
    storage: process.env.DB_PATH || './data/pla-ledger.sqlite',
    logging: false,
  },
  /** 本番環境: 環境変数 DATABASE_URL から PostgreSQL 接続情報を取得 */
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true'
        ? { require: true, rejectUnauthorized: false }
        : false,
    },
  },
  /** テスト環境: インメモリ SQLite を使用 */
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
  },
};

export default config;

module.exports = config;
