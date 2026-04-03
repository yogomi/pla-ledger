#!/bin/bash
set -e

echo "=== PlaLedger Deployment Script ==="

# 環境変数ファイルの確認
if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

# フロントエンドビルド
echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Dockerイメージビルドとコンテナ起動
echo "Building and starting Docker containers..."
docker compose down
docker compose build --no-cache
docker compose up -d

# ヘルスチェック（最大60秒リトライ）
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

echo "=== Deployment completed successfully ==="
