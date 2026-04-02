# pla-ledger
PlaLedger は、事業計画書（ビジネスプラン）を Web 上で作成、保存、公開、共有するプラットフォーム

## 開発環境セットアップ

### 必要条件
- Node.js 20.x 以上
- Docker / Docker Compose（PostgreSQL 用）

### 手順

```bash
# 依存関係インストール
npm run install:all

# 環境変数設定
cp .env.example .env

# 開発用 PostgreSQL 起動（オプション: SQLite の代わりに使用する場合）
docker-compose -f docker-compose.dev.yml up -d

# バックエンド起動
cd backend
npm run dev

# フロントエンド起動（別ターミナル）
cd frontend
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスする。

## 本番環境デプロイ

Docker Compose を使用して AWS EC2 にデプロイする。詳細は [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) を参照。

### 概要

- Express がポート 80 で API とフロントエンド静的ファイルを一元配信する（Nginx 不要）
- PostgreSQL は Docker コンテナとして同一ホスト上で動作する
- ALB を介して HTTPS でアクセスする

```bash
# .env を設定後、デプロイ実行
./deploy.sh
```

## 環境変数

`.env.example` をコピーして `.env` を作成する。

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `NODE_ENV` | 実行環境 | `development` / `production` |
| `PORT` | バックエンドのポート番号 | `3001`（開発） / `80`（本番） |
| `DATABASE_URL` | PostgreSQL 接続 URL（本番） | `postgres://user:pass@host:5432/db` |
| `DB_PATH` | SQLite ファイルパス（開発） | `./data/pla-ledger.sqlite` |
| `JWT_SECRET` | JWT 署名シークレット | 任意の長いランダム文字列 |
| `CORS_ORIGIN` | CORS 許可オリジン（本番） | `https://yourdomain.com` |
