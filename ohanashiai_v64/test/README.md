# おはなしAI 自動スモークテスト（Playwright）

> **v64s3更新（2026-07-15）**: 同梱アプリを v64s3（sw v324）へ差し替え。
> 新チェック6件（分類S）を追加：書類スキャン係／組織図PC幅980px／読み上げ途中停止対策／
> アバター「所属会社」欄／新会社つきアバター追加の一連動作／既存3社長・秘書の挙動不変（確認⑤）。
> 修正: pres-pdf-load のセレクタを現行アプリへ追随（presFileInput→presOpenInput）、
> fixtures/test.pdf 未生成時は RUN_TEST.bat が自動生成。

> **v63e更新（2026-07-11）**: 同梱アプリを v63e（sw v315）へ差し替え。
> 新機能チェック3件を追加（[N] 🏢組織図が開く／⚡返答の速さボタン／声の全ボタン操作＝control_app 86操作にv63c・v63dの14操作が登録済みか）。
> 補足: 環境変数 `OHANASHI_CHROMIUM=<chromium実行ファイルパス>` でブラウザを指定可能（CI・特殊環境向け。通常は不要）。

ブラウザUIを自動操作して、機械で確認できる項目を一括チェックします。
外部通信（Anthropic API・TTS）は**モック**するので、料金も実通信もかかりません。

## これで自動化できること（UI/DOMレベル）
- アプリ起動・バージョン表示・APIキー画面のバイパス
- 主要ボタンの存在、manifest/Service Worker
- テキスト送信→AI返答が表示される（返答内容はモック）
- 🤚割り込みトグルの状態切替
- 各画面が開く：コンテンツ管理／業界ニュース／議事録／プレゼン
- プレゼン：言語スイッチが最上部にある(v61u)／Web参照トグル(v61t)／PDF読み込み描画※
- appVer と sw.js の版番号の整合確認

※ PDF描画は pdf.js を CDN(cdnjs/jsdelivr) から読むため、**インターネット接続が必要**です。
　CDNに到達できない環境では、その項目だけ自動で SKIP になります。

## これは自動化できません（手動チェックリストで確認してください）
- 読み上げ**音声**が鳴る・声/言語が正しい（スピーカー実聴が必要）
- 🤚割り込み・🎙️待受・通訳の**マイク入力**（実音声が必要。iPhoneは特に不可）
- **iPhone固有**（音量duck・キーボード・PWA・iOSの声割り込み）＝実機/実機クラウドが必要
- 実API・実Web検索・実ニュースの**内容**（毎回変わる。モックは「表示される」まで）
- 名刺OCR・写真補正・カメラ、VoiceVox/OpenAI TTS音声

## 使い方（Windows / Mac / Linux 共通）
前提: Node.js 18以上をインストール。

1. この `test` フォルダを、おはなしAIの `index.html` と同じ階層に置く
   （例: `ohanashi/index.html` と `ohanashi/test/`）。
2. コマンドプロンプト/ターミナルで `test` フォルダに入り、初回だけ準備:

   ```
   npm install
   npx playwright install chromium
   ```

3. テスト用PDFを生成（初回だけ。同梱の fixtures/test.pdf があれば省略可）:

   ```
   node genpdf.cjs
   ```

4. 実行:

   ```
   npm test
   ```
   （または `node smoke.cjs`）

5. 結果を確認:
   - コンソールに ✓PASS / ✗FAIL / ⚠SKIP が並びます
   - `test/report.html` … 見やすい結果レポート（手動項目一覧つき）
   - `test/report.json` … 機械可読な結果

## 補足
- `index.html` が別の場所にある場合は、環境変数で指定できます:
  - Windows(PowerShell): `$env:OHANASHI_DIR="C:\path\to\ohanashi"; node smoke.cjs`
  - Mac/Linux: `OHANASHI_DIR=/path/to/ohanashi node smoke.cjs`
- アプリを更新（新しい版）したら、そのまま `npm test` を再実行するだけで再チェックできます。
- チェック項目は `smoke.cjs` の上部 `C('id','分類','項目', async(p)=>{...})` を追記すれば増やせます。
