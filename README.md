# Personal Brain OS

「第二の脳（Second Brain）」を実現する統合知識管理アプリ。
メモ・タスク・アイデア・プロジェクト・知識・人生ログを一元管理し、
過去の知識を再利用して新しいアイデアと行動につなげることを目的とします。

> Notion × Obsidian × Todoist × OneNote × ChatGPT を統合したような体験を目指します。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js (App Router) / TypeScript / Tailwind CSS |
| バックエンド | Supabase (PostgreSQL / Auth / Storage) |
| AI | Claude API (`@anthropic-ai/sdk`) + OpenAI API |
| デプロイ | Vercel |

## ドキュメント

設計は `docs/` に段階的にまとめています。

1. [`docs/DESIGN.md`](docs/DESIGN.md) — 要件整理 / 機能一覧 / システム構成 / 画面設計 / フォルダ構成
2. [`docs/DATABASE.md`](docs/DATABASE.md) — ER図 / DB設計
3. [`docs/API.md`](docs/API.md) — API設計

## セットアップ

```bash
# 1. 依存関係をインストール
npm install

# 2. 環境変数を設定
cp .env.example .env.local
# .env.local を編集（Supabase / Claude / OpenAI のキーを設定）

# 3. Supabase にスキーマを適用
#    supabase/migrations/0001_init.sql を Supabase SQL Editor で実行
#    （または supabase CLI: supabase db push）

# 4. 開発サーバーを起動
npm run dev
```

http://localhost:3000 を開きます。

## MVP の範囲（現状）

- [x] DB スキーマ（全エンティティ + RLS）
- [x] 拡張可能な AI 抽象レイヤー（Claude / OpenAI 切替）
- [x] 認証（Supabase Auth, Magic Link）
- [x] Quick Capture（AI による自動振り分け）
- [x] ダッシュボード（今日のタスク / 最近のメモ / AI提案 / 通知）
- [ ] メモリーツリー UI / ナレッジグラフ UI（次フェーズ）
- [ ] AI秘書（自然言語検索）UI（次フェーズ）

開発手順とフェーズ計画は `docs/DESIGN.md` の「開発ロードマップ」を参照してください。

---

> 注: リポジトリ直下の `oshaberi-ai.html` は本プロジェクトとは別の既存ファイルです（未変更）。
