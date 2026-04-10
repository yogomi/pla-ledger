# PlaLedger 本番環境デプロイガイド

## アーキテクチャ構成

```
Internet
   ↓
ALB (HTTPS: 443)
   ↓ (Target Group)
EC2 (Docker Host)
   ├── Backend Container (Express: ポート80)
   │     - API エンドポイント (/api/*)
   │     - フロントエンド静的ファイル配信 (React SPA)
   └── PostgreSQL Container (ポート5432, 内部のみ)
```

Express がポート80で全リクエストを処理する。Nginx は不要。

---

## 必要な AWS リソース

### VPC 構成
- Public Subnet（ALB 用）
- Private Subnet（EC2 用）
- NAT Gateway（EC2 からの外部通信用）
- Internet Gateway

### EC2 インスタンス
- 推奨スペック: t3.small 以上（メモリ 2GB 以上）
- OS: Amazon Linux 2023 または Ubuntu 22.04 LTS
- Docker / Docker Compose インストール済み

### ALB + Target Group
- リスナー: HTTPS（443）、HTTP（80 → 443 リダイレクト）
- Health Check Path: `/api/health`
- Health Check Interval: 30 秒
- Unhealthy Threshold: 2
- ACM 証明書（SSL/TLS）

### Security Group
- ALB: 0.0.0.0/0 からポート 80、443 を許可
- EC2: ALB の Security Group からポート 80 のみ許可（SSH は管理用 IP のみ）

---

## EC2 初回セットアップ手順

### 1. Docker インストール（Amazon Linux 2023）

```bash
sudo yum update -y
sudo yum install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user
```

### 2. Docker Compose インストール

```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
  -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. アプリケーションディレクトリ作成とリポジトリクローン

```bash
sudo mkdir -p /var/www/pla-ledger
sudo chown -R ec2-user:ec2-user /var/www/pla-ledger
cd /var/www/pla-ledger
git clone https://github.com/yogomi/pla-ledger.git .
```

### 4. 環境変数設定

`.env.example` をコピーして `.env` を作成し、本番用の値を設定する。

```bash
cp .env.example .env
```

`.env` の必須項目：

```bash
NODE_ENV=production
PORT=80
DATABASE_URL=postgres://plaledger:your_password_here@postgres:5432/plaledger
DB_PASSWORD=your_secure_password_here
JWT_SECRET=your_jwt_secret_here
CORS_ORIGIN=https://yourdomain.com
```

### 5. 初回デプロイ

```bash
chmod +x deploy.sh
./deploy.sh
```

### 6. データベースマイグレーション

```bash
docker compose exec backend npx sequelize-cli db:migrate
```

---

## 継続デプロイ（GitHub Actions）

main ブランチへのプッシュで自動デプロイが実行される。

**必要な GitHub Secrets:**

| Secret 名 | 説明 |
|-----------|------|
| `EC2_SSH_PRIVATE_KEY` | EC2 インスタンスへの SSH 秘密鍵 |
| `EC2_HOST` | EC2 インスタンスのパブリック IP またはドメイン |

---

## 監視・ログ確認

```bash
# コンテナ状態確認
docker compose ps

# バックエンドログ確認
docker compose logs -f backend

# PostgreSQL ログ確認
docker compose logs -f postgres

# ヘルスチェック
curl http://localhost/api/health
```

---

## セキュリティ対策

### 環境変数管理
- 機密情報（`JWT_SECRET`、`DB_PASSWORD` 等）は `.env` ファイルに保存し、リポジトリにはコミットしない。
- AWS Systems Manager Parameter Store または Secrets Manager の利用を推奨する。

### ログ管理
- CloudWatch Logs エージェントをインストールし、アプリケーションログを転送する。

### バックアップ
- PostgreSQL データのバックアップは定期的に実施する。

```bash
# PostgreSQL バックアップ例
docker compose exec postgres pg_dump -U plaledger plaledger > backup-$(date +%Y%m%d-%H%M%S).sql
```

---

## コスト試算（月額概算、東京リージョン）

| リソース | 概算費用 |
|---------|---------|
| EC2 t3.small | 約 $15 |
| ALB | 約 $20 + データ転送量 |
| EBS 30GB | 約 $3 |
| **合計** | **約 $40〜$50/月** |

※ トラフィック量により変動する。

---

## トラブルシューティング

### コンテナが起動しない場合

```bash
# ログを確認する
docker compose logs backend

# コンテナを再起動する
docker compose restart backend
```

### データベース接続エラーの場合

```bash
# PostgreSQL コンテナの状態を確認する
docker compose ps postgres

# 接続テスト
docker compose exec postgres psql -U plaledger -c "SELECT 1;"
```

### デプロイのロールバック

```bash
# 前のバージョンに戻す場合
git checkout <前のコミットハッシュ>
./deploy.sh
```
