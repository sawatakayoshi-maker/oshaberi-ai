# Personal Brain OS — 設計書

開発手順 1〜3, 7, 8 をまとめたドキュメントです。
（4. ER図 / 5. DB設計 → [`DATABASE.md`](DATABASE.md) / 6. API設計 → [`API.md`](API.md)）

---

## 1. 要件整理

### 1.1 目的
情報を「保存する」だけでなく、**過去の知識を再利用し、新しいアイデアを生み出し、行動につなげる**こと。
利用者が忘れている知識を AI が掘り起こし、思考と実行を支援する。

### 1.2 利用者・利用環境
- 主たる利用者: 個人（自分専用のセカンドブレイン）。ただしデータモデルはマルチユーザ前提（RLS）。
- 必須環境: Windows PC / iPhone / Web ブラウザ
- 将来環境: Android / Mac
- 方針: **レスポンシブ Web を第一**に。PWA 化でモバイル体験を補強し、将来ネイティブ（Capacitor / Expo 等）に拡張可能な構成にする。

### 1.3 非機能要件
| 項目 | 方針 |
|---|---|
| 高速性 | Quick Capture は開いて 3 秒以内に入力可能。AI 振り分けは非同期・楽観的 UI。 |
| 保守性 | 機能ごとにモジュール分割。AI はプロバイダ抽象化（Claude/OpenAI 差し替え可）。 |
| 拡張性 | エンティティは統合 `items` + 型別属性。ツリー/グラフ/タイムラインを独立テーブルで表現。 |
| セキュリティ | Supabase Auth + 行レベルセキュリティ（RLS）で全テーブルをユーザ単位に隔離。 |
| AI 統合 | 分類・要約・タグ・スコア・検索・提案を共通インターフェース化。 |

---

## 2. 機能一覧

| # | 機能 | 概要 | MVP |
|---|---|---|---|
| 1 | Quick Capture | 3秒で入力 → AI が memo/task/idea/project に自動振り分け | ✅ |
| 2 | メモ | タイトル/本文/タグ/添付/URL/音声。全文検索・AI要約・AIタグ | ✅(基本) |
| 3 | タスク | 期限/優先度/状態/プロジェクト。リマインダー・今日やること・カレンダー | ✅(基本) |
| 4 | アイデア管理 | 説明/関連資料。市場性・実現性・収益性・将来性を AI スコアリング | ✅(基本) |
| 5 | メモリーツリー | 知識を階層管理。ツリー表示・ドラッグ移動 | 次フェーズ |
| 6 | ナレッジグラフ | 知識同士を関連付けネットワーク可視化 | 次フェーズ |
| 7 | プロジェクト管理 | 複数プロジェクト・横断検索 | ✅(基本) |
| 8 | 人生タイムライン | 時系列で人生ログを蓄積 | 次フェーズ |
| 9 | AI秘書 | 自然言語検索・関連情報提示 | 次フェーズ |
| 10 | 通知 | 期限切れ/未着手/放置アイデア/AI再提案 | ✅(基盤) |
| - | 知識進化 | 過去データ分析→類似/関連の自動提案 | 次フェーズ |

---

## 3. システム構成図

```
┌──────────────────────────── Client (Browser / iPhone / Windows) ────────────────────────────┐
│  Next.js (App Router, RSC) + Tailwind                                                        │
│  ├─ Server Components / Server Actions ── データ取得・変更（Supabase server client）           │
│  ├─ Client Components ─────────────── Quick Capture / ツリー / グラフ等のインタラクション        │
│  └─ Route Handlers (/api/*) ──────── AI 連携・Webhook・cron                                   │
└──────────────┬───────────────────────────────────────────────────┬──────────────────────────┘
               │ @supabase/ssr (Cookie セッション)                  │ サーバ専用呼び出し
               ▼                                                    ▼
┌──────────── Supabase ────────────┐               ┌──────────── AI Providers ───────────┐
│  Auth  /  PostgreSQL (RLS)       │               │  AIProvider 抽象                      │
│  Storage（添付・音声）            │◀──────────────│   ├─ ClaudeProvider (@anthropic-ai)   │
│  Realtime（通知・同期, 将来）      │  分析結果保存  │   └─ OpenAIProvider (openai)          │
└──────────────────────────────────┘               └──────────────────────────────────────┘
               ▲
               │ Scheduled (Vercel Cron) → 通知生成・知識進化バッチ
               └────────────────────────────────────────────
```

- **デプロイ**: Vercel（Next.js）+ Supabase（マネージド DB/Auth/Storage）。
- **AI 呼び出しは必ずサーバ側**（APIキー秘匿）。Route Handler / Server Action から `AIProvider` を利用。

---

## 7. 画面設計

### 7.1 画面一覧
| 画面 | パス | 概要 |
|---|---|---|
| ログイン | `/login` | Supabase Auth（Magic Link） |
| ダッシュボード | `/` | 今日のタスク・最近のメモ・注目アイデア・AI提案・通知 |
| インボックス | `/inbox` | Quick Capture の取り込み結果一覧 |
| メモ一覧/詳細 | `/memos`, `/memos/[id]` | 全文検索・AI要約・タグ |
| タスク | `/tasks` | 今日やること・カレンダー |
| アイデア | `/ideas`, `/ideas/[id]` | スコアリング・レーダー |
| プロジェクト | `/projects`, `/projects/[id]` | 横断ビュー |
| メモリーツリー | `/tree` | 階層・ドラッグ移動 |
| グラフ | `/graph` | ネットワーク可視化 |
| タイムライン | `/timeline` | 人生ログ |
| AI秘書 | `/assistant` | 自然言語検索 |
| 設定 | `/settings` | プロバイダ/モデル等 |

### 7.2 レイアウト
- 3 ペイン: **左サイドバー（ナビ）** / **中央コンテンツ** / **右パネル（AI提案・関連）**。
- 常時表示の **Quick Capture バー**（`⌘K` / 画面下固定）でどこからでも 3 秒入力。
- デザインコンセプト: Apple（余白・タイポ）× Notion（情報密度）× Linear（速度・キーボード操作）。

### 7.3 ダッシュボード構成
1. ヘッダー: 日付 / Quick Capture
2. 今日のタスク（期限・優先度）
3. 最近のメモ
4. 注目アイデア（スコア上位）
5. AI 提案カード
6. 通知（期限切れ・放置アイデア）

---

## 8. フォルダ構成

```
.
├─ docs/                         # 設計ドキュメント
│  ├─ DESIGN.md / DATABASE.md / API.md
├─ supabase/
│  └─ migrations/0001_init.sql   # スキーマ + RLS + FTS
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx              # ルートレイアウト（サイドバー等）
│  │  ├─ globals.css
│  │  ├─ page.tsx                # ダッシュボード
│  │  ├─ login/page.tsx
│  │  ├─ auth/callback/route.ts  # Auth コールバック
│  │  └─ api/
│  │     ├─ capture/route.ts     # Quick Capture（AI 振り分け）
│  │     └─ ...                  # 次フェーズ: summarize / score / search / cron
│  ├─ components/
│  │  ├─ quick-capture.tsx
│  │  ├─ sidebar.tsx
│  │  └─ dashboard/*.tsx
│  ├─ lib/
│  │  ├─ supabase/{client,server,middleware}.ts
│  │  ├─ ai/{provider,claude,openai,index}.ts   # AI 抽象レイヤー
│  │  ├─ types.ts                # ドメイン型
│  │  └─ db.ts                   # クエリヘルパ
│  └─ middleware.ts              # セッション更新・認可
├─ package.json / tsconfig.json / next.config.mjs / tailwind.config.ts
└─ .env.example
```

設計方針:
- **機能横断の関心（AI / Supabase / 型）は `lib/` に集約**し、UI から疎結合に。
- AI は `AIProvider` インターフェースで実装を差し替え可能（`AI_PROVIDER` 環境変数）。
- データアクセスは Server Component / Server Action 優先、AI を伴う処理は Route Handler。

---

## 開発ロードマップ

| フェーズ | 内容 | 状態 |
|---|---|---|
| P0 設計 | 本書 / DATABASE / API | ✅ |
| P1 基盤 | スキーマ・RLS・AI抽象・認証 | ✅ |
| P2 MVP | Quick Capture + 振り分け + ダッシュボード + メモ/タスク/アイデアCRUD | 🚧 |
| P3 知識構造 | メモリーツリー / ナレッジグラフ | ⏳ |
| P4 AI体験 | AI秘書（自然言語検索）/ 知識進化提案 / 通知バッチ | ⏳ |
| P5 体験強化 | PWA / 音声入力 / カレンダー / モバイル最適化 | ⏳ |

各フェーズ末でレビューを行い、次フェーズの優先度を調整します。
