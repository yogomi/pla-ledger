# 開発環境とコーディング規約

## 言語
- copilot-instructions.md は日本語メインで記述
- 日本語で回答

## 基本方針
- 文体はやや硬めとする。感情的な表現や名言風表現は避ける。
- 回答の末尾に「何かしましょうか？」等の提案は付けない。本当に有益な場合のみ補足する。

## 使用環境
- **エディタ**: Neovim（init.lua + lazy.nvim 構成）
- **OS**: MacBook Air（macOS）
- **デフォルトシェル**: zsh
- **GitHub Copilot**: copilot.lua

## Web 開発
- **言語**: TypeScript（セミコロンは省略しない）
- **フロントエンド**: React v19.0.0 + Material UI（@mui/material）を主要 UI ライブラリとして採用。
  グローバルテーマ管理、レスポンシブレイアウト、アクセシビリティ対応を実装する。
- **ルーティング**: Reactアプリでは `index.tsx` にてテーマ、CookieProvider、React Router
  （`/pla-ledger/...`）を使用
- **フォーム検証**: Zod + react-hook-form の組合せ。エラーメッセージはロケール対応とする。
- **テーブル表示**: MUI Table をベースに、必要に応じて仮想化（react-window 等）を導入。
- **ORM**: Sequelize を使用。
- **APIサーバー**: Express
- **コメント形式**: JSDoc
- **改行コード**: LF（行末のスペースやタブは禁止）

### 多言語対応方針
- プロジェクト名やユーザーが入力した文字列は言語による区分を行わない。
  入力値をそのまま単一フィールドとして保持する。
- 多言語化の対象は UI 文字列（ラベル、プレースホルダー、メッセージ等）のみとする。
- i18next 等を使用し、翻訳文字列は翻訳ファイルで管理する。

### REST API の JSON 形式
```json
{
  "success": true,
  "code": "",
  "message": "",
  "data": {}
}
```
- `success`: 成功時は `true`、失敗時は `false`
- `code`: エラー時は短く使い回しのきく英語文字列（成功時は空文字）
- `message`: 成功時はユーザー向け英文、失敗時はエラー内容（英文）
- `data`: 任意のデータ本体。ページネーション時は `{ from, count, total, items }` を含める。
  エラー時は `null`。
- クエリストリングや入力の JSON は必ず Zod を使って値チェックをする。
- API を作るときは 1 ファイルに 1 API。仕様はコメントに記載する。

### API コメント形式
```javascript
/**
 * @api {HTTPメソッド} /エンドポイント 概要説明
 * @description
 *   - 機能の簡潔な説明
 *   - 必要に応じて注意事項や利用例を記載
 *
 * @request
 *   - クエリストリング/リクエストボディの各パラメータと型・説明
 *   - バリデーションはzodで行うこと
 *   - バリデーション失敗時は { success: false, code: 'invalid_query', message: 'エラー内容', data: null }
 *
 * @response
 *   - 例: { success: true, code: '', message: '正常終了メッセージ', data: { from, count, total, items } }
 *   - エラー時: { success: false, code: 'error_code', message: 'エラー内容', data: null }
 *
 * @responseExample 成功例
 *   {
 *     "success": true,
 *     "code": "",
 *     "message": "Success message",
 *     "data": {
 *       "from": 0,
 *       "count": 10,
 *       "total": 100,
 *       "items": [ ... ]
 *     }
 *   }
 *
 * @responseExample 失敗例
 *   {
 *     "success": false,
 *     "code": "invalid_query",
 *     "message": "エラー内容（英文）",
 *     "data": null
 *   }
 *
 * @author 作成者
 * @date YYYY-MM-DD
 */
```

#### ポイント
- **@api** タグで HTTP メソッド・エンドポイント・概要を記載
- **@description** で主な機能や注意事項を記載
- **@request** で入力値（クエリ・ボディ）、型、バリデーション方法（Zod 使用）を明記
- バリデーション失敗時の戻り値（`success: false`, `code: 'invalid_query'`, `message: ...`, `data: null`）を明示
- **@response** で正常・異常時のレスポンス仕様を記載
- **@responseExample** で具体的な JSON 例（成功・失敗）を示す
- **@author**, **@date** で作成者と日付を明記

## API 設計
- クエリストリングやリクエストボディの値チェックは、必ず Zod で行う。
- Express の API エンドポイントでは、バリデーション後に安全に値を受け取る方式を徹底する。
- バリデーションエラー時は `{ success: false, code: 'invalid_query', message: 'エラー内容（カンマ区切り）', data: null }` を返す。
  `message` には Zod のエラーメッセージをカンマ区切りで格納する。
- レスポンスの `data` には通常時は `from, count, total, items` 等を含め、エラー時は `null` とする。
- レスポンス形式の詳細：
  - 成功時：`{ success: true, code: '', message: 'ユーザー向け英文', data: {...} }`
  - バリデーション失敗時：`{ success: false, code: 'invalid_query', message: 'カンマ区切りのエラー内容（英文）', data: null }`
  - その他エラー：`{ success: false, code: 'error_code', message: 'エラー内容（英文）', data: null }`

## Python
- docstring は Google スタイルを使用する。モジュール・クラス・公開関数には必ず付与する。
  内部関数（アンダースコア始まり等）も複雑な処理には付与することを推奨する。
- 記載項目：説明、Args（引数）、Returns（戻り値）、Raises（例外）、副作用（該当する場合）。

```python
def example_function(param1: str, param2: int) -> bool:
    """概要を一行で記述する。

    必要に応じて詳細な説明を続ける。

    Args:
        param1: パラメータ1の説明。
        param2: パラメータ2の説明。

    Returns:
        戻り値の説明。

    Raises:
        ValueError: 不正な値が渡された場合。
    """
```

## 開発プロジェクト
- GitHub で pull request を作成するときは日本語で書く。
- コードは一行に 100 文字まで。
- pull request 作成などでコードを変える際には、変更前と同等レベルのコメントを残す。
- 改行コードは LF とする。行末のスペースやタブは禁止。

## PlaLedger 固有方針

### MUI 採用方針
- グローバルテーマ（`createTheme`）でカラー・タイポグラフィ・コンポーネントスタイルを一元管理する。
- レスポンシブレイアウトには MUI の `Grid`・`Box`・`sx` prop を活用する。
- テーブル表示は MUI Table をベースとし、行数が多い場合は仮想化（react-window 等）を検討する。
- フォーム検証は Zod + react-hook-form を使用し、エラーメッセージはロケール対応とする。
- アクセシビリティ（aria 属性）を意識したコンポーネント設計を行う。
- カスタムコンポーネントは `frontend/src/components/` 配下に配置する。

### 多言語対応
- i18next（react-i18next）を使用し、UI 文字列（ラベル、プレースホルダー、バリデーションメッセージ等）を
  翻訳ファイルで管理する。
- ユーザーが入力した文字列（プロジェクト名等）は言語による区分を行わない。
  単一フィールドにそのまま保持する。

### 権限管理
- 権限チェックはミドルウェアまたはサービス層で集中して行う。
- コントローラー層に権限チェックロジックを分散させない。

### 財務データ管理
- 財務データは DB に保存し、重要な数値は正規化カラムに保持する（丸め誤差を防ぐため）。
- バージョン管理はスナップショット方式を採用する。

### 添付ファイル
- ファイルはオブジェクトストレージ（S3 互換）に保存し、署名付き URL で提供する。
- アップロード時は MIME 検査・ウイルススキャン連携を行う。

### 監査ログ
- 操作ログには who（誰が）・what（何を）・when（いつ）を必ず記録する。

### セキュリティ
- ファイルアップロード：MIME 検査・ウイルススキャン連携を実施する。
- XSS 対策：ユーザー入力を出力する際は必ずサニタイズする。
- 認可：厳格な認可チェックを実装し、不正アクセスを防止する。
- プロジェクト名等のユーザー入力はそのまま保持するが、表示時はエスケープ処理を行う。

## フォルダ構成と基本方針

### フォルダ構成（モノレポ構成）
```
pla-ledger/
├── frontend/          # React フロントエンド
│   └── src/
│       ├── components/  # React コンポーネント
│       ├── pages/       # ページコンポーネント
│       ├── hooks/       # カスタムフック
│       ├── api/         # API クライアント
│       └── i18n/        # 翻訳ファイル
├── backend/           # Express バックエンド
│   └── src/
│       ├── api/         # API エンドポイント（1 ファイル 1 API）
│       ├── routes/      # ルート集約
│       ├── models/      # Sequelize モデル
│       ├── middlewares/ # ミドルウェア（認証・権限・バリデーション等）
│       └── services/    # ビジネスロジック
├── .github/           # GitHub 関連設定（Actions・Copilot 等）
└── scripts/           # ビルド・デプロイ用スクリプト
```

### 基本方針
- 各フォルダは責務に応じて明確に分割する。
- ファイル名は一貫性を持たせ、スネークケースまたはキャメルケースを使用する。
- コードの変更は必ずレビューを経てマージする。
- ドキュメントやコメントを充実させ、他の開発者が理解しやすいコードを心がける。

## 技術スタック

| 分類 | 技術 |
|------|------|
| フロントエンド | React 19（TypeScript）、MUI（@mui/material）、react-router、react-hook-form + Zod、i18next |
| バックエンド | Node.js + Express（TypeScript）、Sequelize（PostgreSQL） |
| ストレージ | S3 互換オブジェクトストレージ |
| CI/CD | GitHub Actions |
