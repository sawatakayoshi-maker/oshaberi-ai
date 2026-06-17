# Personal Brain OS — セットアップ手順書

ゼロから本番稼働（Vercel + Supabase）まで通すための手順書です。
所要時間の目安: 20〜30分。

---

## 0. 必要なもの

| 項目 | 用途 | 取得先 |
|---|---|---|
| Node.js 18 以上 | ローカル開発 | https://nodejs.org |
| Supabase アカウント | DB / 認証 / ストレージ | https://supabase.com |
| Anthropic API キー | Claude（既定の AI） | https://console.anthropic.com |
| OpenAI API キー（任意） | OpenAI に切替える場合のみ | https://platform.openai.com |
| Vercel アカウント | デプロイ | https://vercel.com |

> AI は既定で **Claude** を使用します。OpenAI は任意です。

---

## 1. プロジェクトの展開

配布 zip を展開し、フォルダに移動します。

```bash
unzip personal-brain-os.zip
cd personal-brain-os
npm install
```

---

## 2. Supabase プロジェクトを作成

1. https://supabase.com にログイン →「New project」
2. 任意の名前・リージョン（東京 `Northeast Asia (Tokyo)` 推奨）・DB パスワードを設定して作成
3. 作成後、左メニュー **Project Settings → API** を開き、以下を控える
   - **Project URL**（`https://xxxx.supabase.co`）
   - **anon public** キー
   - **service_role** キー（※サーバ専用。絶対に公開しない）

---

## 3. データベースのスキーマを適用

1. Supabase 左メニュー **SQL Editor** →「New query」
2. リポジトリの `supabase/migrations/0001_init.sql` の中身を**全文コピー**して貼り付け
3. **Run** を実行

これで以下が作成されます。
- 全テーブル（items / projects / tree_nodes / links / timeline_events / tags / attachments / notifications / ai_suggestions / profiles）
- 行レベルセキュリティ（RLS）— ユーザごとにデータを隔離
- 全文検索インデックス
- 新規ユーザ登録時の profiles 自動作成トリガ

> Supabase CLI を使う場合は `supabase db push` でも適用できます。

---

## 4. 認証メール（Magic Link）の設定

本アプリは**メールのログインリンク（Magic Link）**でログインします。

1. Supabase 左メニュー **Authentication → Providers → Email** を開く
2. **Email** が有効になっていることを確認（既定で有効）
3. **Authentication → URL Configuration** で **Site URL** を設定
   - ローカル開発: `http://localhost:3000`
   - 本番: `https://あなたのドメイン.vercel.app`
4. **Redirect URLs** に次を追加（両方）
   - `http://localhost:3000/auth/callback`
   - `https://あなたのドメイン.vercel.app/auth/callback`

> 開発中は Supabase の組み込みメールで十分です。本番で大量送信する場合は Authentication → Emails から SMTP（SendGrid 等）を設定してください。

---

## 5. 環境変数の設定（ローカル）

`.env.example` をコピーして `.env.local` を作成し、値を埋めます。

```bash
cp .env.example .env.local
```

`.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=（anon public キー）
SUPABASE_SERVICE_ROLE_KEY=（service_role キー）

# AI（既定は claude）
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-4-8

# OpenAI を使う場合のみ
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# 通知バッチを全ユーザ対象で動かす場合（任意）
CRON_SECRET=（任意のランダム文字列）

# サイトURL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> **OpenAI に切替えたい場合**は `AI_PROVIDER=openai` にして `OPENAI_API_KEY` を設定するだけです。

---

## 6. ローカルで起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く →
1. `/login` に自動で遷移
2. メールアドレスを入力して「ログインリンクを送る」
3. 届いたメールのリンクを開くとダッシュボードに入れます

### 動作確認チェックリスト
- [ ] 上部の入力バー（⌘K / Ctrl+K）に「水素事業の補助金を調べる」と入力 →（数秒後）タスクとして振り分けられる
- [ ] `/memos` でメモ作成 →「AI要約」ボタンで要約される
- [ ] `/ideas` でアイデア作成 →「AIスコアリング」で4軸スコアが付く
- [ ] `/tree` で項目を作成し、ドラッグで階層移動できる
- [ ] `/graph` で2項目を関連付け → ネットワーク図に線が表示される
- [ ] `/assistant` で「水素」など自然言語検索 → 回答と関連情報が出る

---

## 7. Vercel へデプロイ

### 7-1. リポジトリを用意
GitHub にリポジトリを作成し、本プロジェクトを push します。
（すでに `claude/modest-sagan-wvnr56` ブランチに push 済みの場合はそれを使えます）

```bash
git init           # zip から始める場合
git add -A
git commit -m "init"
git remote add origin https://github.com/あなた/リポジトリ.git
git push -u origin main
```

### 7-2. Vercel にインポート
1. https://vercel.com → 「Add New → Project」→ 対象リポジトリを選択
2. Framework は **Next.js**（自動検出）
3. **Environment Variables** に手順5の値をすべて登録
   （`NEXT_PUBLIC_*` / `SUPABASE_SERVICE_ROLE_KEY` / `AI_PROVIDER` / `ANTHROPIC_API_KEY` など）
   - `NEXT_PUBLIC_SITE_URL` は本番URLに変更
4. **Deploy** を実行

### 7-3. 本番URLを Supabase に反映
デプロイ完了後の本番URL（例 `https://xxx.vercel.app`）を
**手順4** の Site URL / Redirect URLs に追加してください。

---

## 8. 通知バッチ（Vercel Cron）

`vercel.json` に毎日0時(UTC)実行の Cron が定義済みです。

```json
{ "crons": [{ "path": "/api/cron/notifications", "schedule": "0 0 * * *" }] }
```

- 期限切れタスク / 30日以上更新のないアイデア を検出して通知を作成します。
- **全ユーザを対象に動かす**には Vercel の環境変数に `CRON_SECRET` を設定してください。
  Vercel Cron が `Authorization: Bearer <CRON_SECRET>` を自動付与し、サーバが service_role で全ユーザを処理します。
- 手動実行（ログイン中の自分だけ対象）: ブラウザで `/api/cron/notifications` にアクセス。

---

## 9. AI プロバイダの切替

| 設定 | 使うモデル |
|---|---|
| `AI_PROVIDER=claude`（既定） | `ANTHROPIC_MODEL`（既定 `claude-opus-4-8`） |
| `AI_PROVIDER=openai` | `OPENAI_MODEL`（既定 `gpt-4o-mini`） |

環境変数を変えて再デプロイ（またはローカル再起動）するだけで切替わります。
コードは `src/lib/ai/` の `AIProvider` インターフェースで抽象化されています。

---

## 10. よくあるトラブル

| 症状 | 原因 / 対処 |
|---|---|
| ログインリンクで戻ると `/login` に戻される | Supabase の **Redirect URLs** に `…/auth/callback` を登録したか確認 |
| ログイン後にデータが見えない/保存できない | スキーマSQL（手順3）未適用、または RLS によるもの。SQL を再実行 |
| Quick Capture が必ず「メモ」になる | `ANTHROPIC_API_KEY` 未設定 or 残高切れ。AI失敗時はメモにフォールバックする仕様 |
| `Invalid API key`（AI） | キーの値・`AI_PROVIDER` の綴りを確認 |
| 日本語検索の精度が低い | 既定は Postgres `simple` 構成のため。`pgroonga` / `pg_bigm` 導入で改善（`docs/DATABASE.md` 参照） |

---

## 11. コマンド早見表

```bash
npm install        # 依存インストール
npm run dev        # 開発サーバ（http://localhost:3000）
npm run build      # 本番ビルド
npm run start      # 本番起動（build後）
npm run typecheck  # 型チェック（tsc）
npm run lint       # Lint
```

---

## 関連ドキュメント
- `docs/DESIGN.md` … 要件 / 機能一覧 / 構成図 / 画面 / フォルダ / ロードマップ
- `docs/DATABASE.md` … ER図 / DB設計
- `docs/API.md` … API設計 / AI抽象インターフェース
