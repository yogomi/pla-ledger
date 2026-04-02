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
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# ヘルスチェック
echo "Waiting for services to be healthy..."
sleep 15
curl -f http://localhost/api/health || exit 1

echo "=== Deployment completed successfully ==="
