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
| `APP_URL` | アプリケーション URL（パスワードリセットリンク生成に使用） | `http://localhost:3000` |
| `EMAIL_FROM` | メール送信元アドレス | `noreply@plaledger.com` |
| `EMAIL_FROM_NAME` | メール送信元名 | `PlaLedger` |
| `SMTP_HOST` | SMTP サーバーホスト | `localhost`（Mailhog）/ `smtp.gmail.com` |
| `SMTP_PORT` | SMTP ポート番号 | `1025`（Mailhog）/ `587`（Gmail） |
| `SMTP_SECURE` | SSL/TLS 使用 | `false` / `true` |
| `SMTP_USER` | SMTP 認証ユーザー名 | Gmail アドレス等 |
| `SMTP_PASS` | SMTP 認証パスワード | アプリパスワード等 |

## 開発環境でのメール送信テスト

### Mailhog を使用する方法（推奨）

Mailhog はローカル開発用の SMTP サーバーで、送信されたメールをブラウザで確認できる。

**1. Mailhog の起動（Docker 使用）**

```bash
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog
```

**2. 環境変数の設定**

`.env` ファイルに以下を設定：

```bash
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
APP_URL=http://localhost:3000
```

**3. メール確認**

パスワードリセットリクエスト後、`http://localhost:8025` にアクセスして送信されたメールを確認する。

### Gmail を使用する方法（本番環境想定）

**1. Google アカウントで「アプリパスワード」を生成**

- Google アカウント設定 > セキュリティ > 2 段階認証プロセスを有効化
- 「アプリパスワード」を生成（アプリ：メール、デバイス：その他）
- 生成された 16 桁のパスワードをメモ

**2. 環境変数の設定**

`.env` ファイルに以下を設定：

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=PlaLedger
APP_URL=http://localhost:3000
```

**注意：**
- `SMTP_USER` と `EMAIL_FROM` は同じ Gmail アドレスを使用
- `SMTP_PASS` には生成したアプリパスワードを使用（通常のパスワードではない）
- Gmail は 1 日の送信数に制限あり（無料アカウント：500 通/日）

### 本番環境での推奨サービス

- **SendGrid**: 無料枠あり、信頼性高い
- **AWS SES**: AWS ユーザーに最適、低コスト
- **Mailgun**: 開発者向け、API 充実

## データベースマイグレーション

sequelize-cli を使用してスキーマを管理する。コンテナ起動時に自動的にマイグレーションが実行される。

### マイグレーション実行

```bash
docker-compose exec backend npm run migrate
```

### マイグレーション状態確認

```bash
docker-compose exec backend npm run migrate:status
```

### マイグレーションロールバック

```bash
docker-compose exec backend npm run migrate:undo
```
