#!/bin/bash
set -e

echo "=== PlaLedger Update Script ==="

# 環境変数ファイルの確認
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

# コード取得
echo "Pulling latest code..."
git pull origin main

# フロントエンドビルド
echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# バックエンドのみ再ビルドして再起動（postgresは停止しない）
echo "Rebuilding backend container..."
docker compose build backend
docker compose up -d backend

# ヘルスチェック（最大60秒リトライ）
# 起動時にDBマイグレーションが自動実行されるため、やや長めに待機する
echo "Waiting for services to be healthy..."
MAX_RETRIES=12
RETRY_INTERVAL=5
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf http://localhost:30040/api/health > /dev/null 2>&1; then
    echo "Health check passed."
    break
  fi
  if [ "$i" -eq "$MAX_RETRIES" ]; then
    echo "Health check failed after $((MAX_RETRIES * RETRY_INTERVAL)) seconds."
    exit 1
  fi
  echo "Waiting... ($i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo "=== Update completed successfully ==="
