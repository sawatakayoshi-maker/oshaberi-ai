# API 設計

開発手順 6。データ CRUD は基本 **Server Component / Server Action**（Supabase RLS 経由）。
AI を伴う処理・外部連携・cron は **Route Handler (`/api/*`)** に置く。

## 認証
- Supabase Auth（Cookie セッション, `@supabase/ssr`）。
- `middleware.ts` でセッション更新。未認証は `/login` へ。

## エンドポイント（Route Handlers）

### POST `/api/capture` — Quick Capture
入力テキストを AI で分類し `items` に保存する。

Request:
```json
{ "text": "水素事業について補助金を調べる" }
```
処理:
1. 認証ユーザを取得。
2. `AIProvider.classifyCapture(text)` で `{ kind, title, tags, priority?, due_hint?, summary? }` を推論。
3. `items` に INSERT（`source = "quick_capture"`）、タグを upsert。
4. 結果を返す。

Response:
```json
{
  "item": { "id": "…", "kind": "task", "title": "水素事業の補助金を調べる", "priority": 2 },
  "classification": { "kind": "task", "confidence": 0.82, "tags": ["水素事業","補助金"] }
}
```

### （次フェーズ）
| メソッド | パス | 概要 |
|---|---|---|
| POST | `/api/items/:id/summarize` | 本文を AI 要約し `ai_summary` 更新 |
| POST | `/api/items/:id/tags` | AI タグ生成 |
| POST | `/api/ideas/:id/score` | アイデアを 4 軸スコアリング |
| POST | `/api/assistant/search` | 自然言語検索（FTS + AI 再ランク + 回答生成） |
| POST | `/api/suggestions/generate` | 知識進化: 類似/関連/放置の提案生成 |
| GET/POST | `/api/cron/notifications` | 期限切れ・放置アイデア通知（Vercel Cron） |

## AI 抽象インターフェース
`src/lib/ai/provider.ts` の `AIProvider`:

```ts
interface AIProvider {
  classifyCapture(text: string): Promise<CaptureClassification>;
  summarize(text: string): Promise<string>;
  generateTags(text: string): Promise<string[]>;
  scoreIdea(input: { title: string; body: string }): Promise<IdeaScores>;
  answer(question: string, context: string): Promise<string>; // AI秘書
}
```
- 実装: `ClaudeProvider`（既定, `@anthropic-ai/sdk`）/ `OpenAIProvider`。
- 選択: 環境変数 `AI_PROVIDER`（`claude` | `openai`）。
- すべて **サーバ側**でのみ実行（APIキー秘匿）。構造化出力は JSON Schema で制約。

## エラーハンドリング
- 401: 未認証。
- 400: バリデーション失敗（空テキスト等）。
- 502: AI プロバイダ失敗 → 振り分けは `kind="memo"` にフォールバックして保存（取りこぼし防止）。
