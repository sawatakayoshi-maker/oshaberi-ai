# 書類スキャナー（フェーズ0 MVP）

撮影 → 四隅検出 → 台形補正 → PDF 保存 → 端末内一覧、を最小構成で実現する Flutter アプリです。

## スコープ（フェーズ0）

| 項目 | 内容 |
| --- | --- |
| 目的 | 撮影 → 四隅検出 → 台形補正 → PDF 保存 → 端末内一覧 |
| 技術 | Flutter / `flutter_doc_scanner`（Android: ML Kit / iOS: VisionKit）/ Riverpod / SQLite（`sqflite`） |
| 一覧からの再表示 | アプリ内 PDF ビューア（`pdfx`、ネイティブレンダラ） |

### やらないこと（フェーズ0の禁止事項）

- OpenCV の自作（四隅検出・台形補正はプラットフォーム機能に委譲）
- TFLite モデル
- クラウド連携（保存はすべて端末内）
- OCR / AI 機能
- 認証

これらは後続フェーズ（1: OCR＋全文検索、2: 領収書3項目抽出＋検索可能PDF、3: Google Drive、4以降: その他）で扱います。

## 受け入れ基準

> 実機で A4 を 5 ページ連続スキャンし、PDF 1 本が保存され、一覧から再表示できること（失敗 0/5）。

チェック手順は [`docs/PHASE0_ACCEPTANCE.md`](docs/PHASE0_ACCEPTANCE.md) を参照。

## セットアップ

このリポジトリは `lib/` と `pubspec.yaml` を正本として管理し、`android/` `ios/` の雛形は
コミットしていません（環境ごとに `flutter create` で生成するのが最も安定するため）。

```bash
# 1. プラットフォーム雛形を生成（既存の lib/・pubspec.yaml は上書きされません）
./tool/bootstrap.sh
#   ↑ 内部で `flutter create --platforms=android,ios .` と `flutter pub get` を実行
```

続いて、下記の「プラットフォーム設定」を **1 回だけ** 適用してください。

### プラットフォーム設定

#### Android

`flutter_doc_scanner`（ML Kit Document Scanner）は `minSdkVersion 21` 以上が必要です。

- `android/app/build.gradle`（または `build.gradle.kts`）の `minSdkVersion` を `21` 以上に設定。
  Flutter 既定値が 21 未満の場合のみ変更してください。
- カメラ機能を任意要件として宣言（`android/app/src/main/AndroidManifest.xml` の `<manifest>` 直下）:

  ```xml
  <uses-feature android:name="android.hardware.camera" android:required="false" />
  ```

  ※ ML Kit のスキャン UI は Google Play 開発者サービス側で動作するため、`CAMERA` の
  実行時パーミッション宣言は不要です。

#### iOS

- `ios/Runner/Info.plist` に撮影用途の説明を追加:

  ```xml
  <key>NSCameraUsageDescription</key>
  <string>書類を撮影してスキャンするためにカメラを使用します。</string>
  ```

- `ios/Podfile` の先頭を iOS 13.0 に:

  ```ruby
  platform :ios, '13.0'
  ```

- `ios/Podfile` の `post_install` にカメラ用マクロを追加:

  ```ruby
  post_install do |installer|
    installer.pods_project.targets.each do |target|
      flutter_additional_ios_build_settings(target)
      target.build_configurations.each do |config|
        config.build_settings['GCC_PREPROCESSOR_DEFINITIONS'] ||= [
          '$(inherited)',
          'PERMISSION_CAMERA=1',
        ]
      end
    end
  end
  ```

## 実行

```bash
flutter run          # 実機を接続して実行
```

> スキャナはカメラを使うため、**実機での動作が前提**です（シミュレータ/エミュレータ不可）。

## 構成

```
lib/
  main.dart                         アプリ起動（ProviderScope）
  src/
    app.dart                        MaterialApp
    data/
      scan_document.dart            スキャン1件のモデル
      app_database.dart             sqflite 接続（documents テーブル）
      document_repository.dart      一覧取得 / 追加 / 削除（PDF ファイルも削除）
      scanner_service.dart          flutter_doc_scanner 起動 → PDF を端末内へ永続化
    providers/
      providers.dart                Riverpod プロバイダ / 一覧 Notifier
    features/
      home/
        home_screen.dart            一覧・スキャンボタン
        document_list_tile.dart     一覧の1行
      viewer/
        pdf_viewer_screen.dart      一覧からの再表示（pdfx）
```

### データの流れ

1. 「スキャン」→ `ScannerService` がネイティブスキャナを起動（四隅検出・台形補正・PDF化はOS機能）。
2. 生成された一時 PDF をアプリのドキュメントディレクトリ（`scans/`）へコピーして永続化。
3. メタデータ（タイトル・パス・ページ数・作成日時）を SQLite に保存。
4. 一覧はタップで `pdfx` によりアプリ内で再表示。削除は行とファイルの両方を削除。

保存先はすべて端末内アプリサンドボックスで、外部送信は行いません。

---

補足: リポジトリ直下の `oshaberi-ai.html` は本アプリとは無関係の別モックです（本 MVP の対象外）。
