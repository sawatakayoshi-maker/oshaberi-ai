# アセアンテクノロジー 採用サイト

「ここで働く"仲間"が見える採用サイト」。社員キャラクターを主役に、多国籍チームの一体感と、
定着・成長・帰属の仕組みを伝える、採用特化の静的サイトです。

- 技術：素の **HTML / CSS / JavaScript（ビルド不要）**
- データ：`/data/*.json`（コンテンツはここを編集するだけで差し替え可能）
- 多言語：自前の軽量 i18n。**日本語・英語を実装**、ベトナム語/タイ語/ポルトガル語はキー構造のみ用意

---

## 1. 起動方法

ビルドは不要ですが、ページが `/data/*.json` や `/i18n/*.json` を **fetch** で読み込むため、
ローカルでは **簡易HTTPサーバ経由** で開いてください（`file://` 直開きだと fetch がブロックされます）。

```bash
# どれか1つ。プロジェクト直下で実行し、表示されたURLを開く
python3 -m http.server 8000
#   → http://localhost:8000/

# もしくは Node 環境があれば
npx serve .
```

トップは `index.html`。各ページは `/about.html` `/members.html` … のように開けます。

---

## 2. ディレクトリ構成

```
.
├── index.html / about.html / members.html / jobs.html /
│   grow.html / future.html / numbers.html / faq.html / entry.html
├── assets/
│   ├── css/styles.css        … デザインシステム（カラー・コンポーネント）
│   └── js/
│       ├── i18n.js           … 多言語の読み込み・適用
│       ├── layout.js         … 共通ヘッダー/フッター/CTA/言語切替の注入
│       └── app.js            … JSON描画（図鑑/数字/FAQ/各カード/フォーム）
├── data/                     … ★コンテンツ（ここを編集）
│   ├── members.json          … 仲間図鑑（41名分の枠）
│   ├── services.json / jobs.json / programs.json
│   ├── future.json / numbers.json / faq.json
├── i18n/                     … ja / en（実装）, vi / th / pt（空キー）
└── public/images/members/    … 社員キャラ画像の置き場所（未配置でも崩れません）
```

既存の `oshaberi-ai.html` は本サイトと無関係な別ファイルです（温存）。

---

## 3. コンテンツの差し替え方法

すべて `/data/*.json` を編集するだけです（HTML/JSの編集は不要）。

| 変えたいもの | 編集するファイル |
|---|---|
| 仲間図鑑の社員（氏名・部署・出身・国旗・コメント・ストーリー） | `data/members.json` |
| 事業紹介 | `data/services.json` |
| 職種カード | `data/jobs.json` |
| 定着・成長の制度カード | `data/programs.json` |
| 新サービス構想 | `data/future.json` |
| 数字カウンター | `data/numbers.json` |
| FAQ | `data/faq.json` |
| ナビ/フッター/ボタン等の文言・英訳 | `i18n/ja.json` / `i18n/en.json` |

### 社員（members.json）の追加例

```json
{
  "id": "ct-003",
  "name": "氏名",
  "department": "contract",        // president/vietnam/contract/dispatch/sales/homework/accounting
  "role": "役割",
  "origin": "VN",                  // JP/VN/TH/BR
  "flagBadge": "VN",               // "VN"|"TH"|"BR"|"ASEAN"|null（組織図の表示に厳密に従う）
  "image": "/public/images/members/ct-003.png",
  "comment": "ひとことコメント",
  "story": { "joinReason": "...", "aDay": "...", "message": "..." }
}
```

- 画像を `image` のパスに置けば表示。無ければ部署カラー＋イニシャルのプレースホルダになります。
- `comment` や `story.*` が `[要確認]` を含む場合は、UI 上で「[要確認]」表示になります。

---

## 4. ⚠️ `[要確認]` / デモデータ チェックリスト（後で埋める箇所）

> 一部はデモ用のサンプル（創作）を表示しています。各JSONの `_demo: true` と画面上の「🧪 DEMO」表示が目印です。
> 実データに差し替えてください。氏名・所属・国旗・会社情報は創作していません。

### 現在「デモ用サンプル（創作）」を表示中（要差し替え）
- [ ] 各社員の `comment` / `story.*`（`data/members.json`・`_demo: true`）
- [ ] FAQ 回答（`data/faq.json`・`_demo: true`）
- [ ] 職種の「未経験可否」など条件（`data/jobs.json`・`_demo: true`）
- [ ] 数字カウンターの各値（`data/numbers.json`・`_demo: true`）

### 会社・代表
- [ ] **サイト表示する代表名**：代表取締役「中山 浩行」か、組織図上の社長「西尾 武志」か（`data/members.json` ceo-001 / `about.html`）
- [ ] 売上高・従業員数（`about.html`）

### 仲間図鑑（最重要）
- 氏名・所属・国旗は組織図どおり投入済み（ユーザー確認済み）。営業(sl-001)／内職(hw-001)の「河合佑司」は同一人物の **意図的な重複**（統合しない）。
- [ ] 各社員のキャラ画像を `public/images/members/` に配置
- [ ] 各社員の `comment` / `story`（現在はデモ用サンプル）

### 事業・職種・制度
- [ ] 内職の「全品検査・即納」など具体表現の裏取り（`data/services.json`）
- [ ] `data/programs.json` の各制度が **実在 / 導入提案 / 検討中** のどれか

### エントリー
- [ ] フォームの実送信先（現在はデモのため `console.log` 出力のみ）— `assets/js/app.js` の `initEntry`
- [ ] LINE応募URL・カジュアル面談予約URL（`entry.html`）
- [ ] プライバシーポリシーURL（`entry.html`）

### SEO / 画像
- [ ] OGP画像 `public/images/ogp.png`
- [ ] `jobs.html` の JobPosting 構造化データ（職種ごとの値）

### 多言語
- 日本語・英語：ナビ／フッター／フォーム／見出し・リード／各データカード（事業・職種・制度・新サービス・FAQ）まで翻訳済み。
  - データの英語は各 JSON の `*En` フィールド（例 `titleEn` `descEn` `aEn`）、ページ見出しは `i18n/en.json` の `page.*`。
- ベトナム語(vi)・タイ語(th)・ポルトガル語(pt)：共通UI（ナビ・CTA・フッター・フォーム・図鑑フィルタ・フィールド名）＋**全ページの見出し・リード（`page.*` 47キー）** を翻訳済み。
  - [ ] データカード本文（事業・職種・制度・新サービス・FAQの各カード）は未翻訳で、日本語へ自動フォールバック（必要なら各JSONに `*Vi/*Th/*Pt` フィールド追加で拡張可）

---

## 5. デザイントークン

部署アクセントカラーは組織図と統一（`assets/css/styles.css` の `:root`）。

| 区分 | 色 |
|---|---|
| 社長 | `#1F2A44` |
| ベトナムチーム | `#D7263D` / `#F4C430` |
| 請負事業 | `#E8743B` |
| 派遣事業 | `#3FA66A` |
| 営業 | `#2D7DD2` |
| 内職事業 | `#F2B705` |
| 経理事務 | `#7A4FB5` |

ベース：オフホワイト `#FAFAF7` ／ テキスト `#2B2B2B`。本文フォントは游ゴシック系。

---

## 6. アクセシビリティ / SEO

- 画像 alt、フォーカスリング、スキップリンク、`aria-*`、コントラスト配慮（WCAG AA を目標）
- `prefers-reduced-motion` 対応
- 各ページに title / description / OGP、構造化データ（Organization / JobPosting）の雛形

---

## 7. デプロイ

ビルド不要のため、リポジトリの内容をそのまま静的ホスティング（Netlify / Vercel / GitHub Pages / S3 等）に配置すれば動作します。
ルート（`/`）からの絶対パスで `assets` `data` `i18n` `public` を参照しています。
