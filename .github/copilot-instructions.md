# 開発環境とコーディング規約

## 言語
- copilot-instructions.md は日本語メインで記述
- 日本語で回答

## 使用環境
- **エディタ**: Neovim（init.lua + lazy.nvim 構成）
- **デフォルトシェル**: zsh

## Web開発
- **言語**: TypeScript（セミコロンは省略しない）
- **フレームワーク**: React v19.0.0 + react-leaflet v5.0.0 + leaflet v1.9.4
- **構成**: Reactアプリでは `index.tsx` にてテーマ、CookieProvider、React Router（`/quest-board/...`）を使用
- **APIサーバー**: Express
- **コメント形式**: JSDoc

### REST APIのJSON形式
```json
{
  "success": true,           // または false
  "code": "",                // エラー時は短く使い回しのきく英語文字列
  "message": "",             // 成功時はユーザー向け英文、失敗時はエラー内容（英文）
  "data": {}                 // 任意：データ本体
}
```
- クエリストリングや入力のJSONは必ずZodを使って値チェックをする
- APIを作るときは1ファイルに1API。仕様はコメントに記載する。コメントでの使用の形式は以下の通り。

### APIコメント形式
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

### ポイント
- **@api** タグでHTTPメソッド・エンドポイント・概要を記載
- **@description** で主な機能や注意事項を記載
- **@request** で入力値（クエリ・ボディ）、型、バリデーション方法（zod使用）を明記
- バリデーション失敗時の戻り値（success: false, code: 'invalid_query', message: ..., data: null）を明示
- **@response** で正常・異常時のレスポンス仕様を記載
- **@responseExample** で具体的なJSON例（成功・失敗）を示す
- **@author**, **@date** で作成者と日付を明記

## API設計の好み
- クエリストリングやリクエストボディの値チェックは、必ずZodで行う。
- ExpressのAPIエンドポイントでは、バリデーション後、安全に値を受け取る方式を徹底する。
- バリデーションエラー時は、REST APIのJSONレスポンス（{success, code, message, data}形式）で、success: false・code: 'invalid_query'・messageにはzodのエラーメッセージをカンマ区切りで格納して返す。
- レスポンスのdataには通常時はfrom, count, total, itemsなどを含め、エラー時はnullまたは空オブジェクトとする。

## 開発プロジェクト
- GitHubでpull requestを作成するときは日本語で書いて。
- コードは一行に100文字まで。
- pullリクエスト作成などでコードを変える際には、変える前と同等レベルのコメントを残すこと。
- 行末のスペースやタブは禁止

## フォルダ構成と基本方針

### フォルダ構成
- **src/**: アプリケーションのソースコードを格納
  - **api/**: APIエンドポイントの実装
  - **components/**: Reactコンポーネント
- **config/**: 設定ファイル
- **scripts/**: ビルドやデプロイ用のスクリプト
- **.github/**: GitHub関連の設定ファイル

### 基本方針
- 各フォルダは責務に応じて明確に分割する。
- ファイル名は一貫性を持たせ、スネークケースまたはキャメルケースを使用する。
- コードの変更は必ずレビューを経てマージする。
- ドキュメントやコメントを充実させ、他の開発者が理解しやすいコードを心がける。
