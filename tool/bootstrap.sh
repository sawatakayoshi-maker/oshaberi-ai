#!/usr/bin/env bash
# フェーズ0 MVP のプラットフォーム雛形（android/ ios/）を生成し、依存を取得する。
#
# lib/ と pubspec.yaml はこのリポジトリが正本。`flutter create` は既存ファイルを
# 上書きしないため、以下を実行しても Dart ソースは保持される。
#
# 実行後、README.md の「プラットフォーム設定」に従って手動編集を 1 回だけ行うこと。
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> flutter create（android/ios 雛形を生成。既存の lib/・pubspec.yaml は保持）"
flutter create \
  --project-name oshaberi_scanner \
  --org jp.oshaberi \
  --platforms=android,ios \
  .

echo "==> flutter pub get"
flutter pub get

cat <<'EOS'

雛形の生成が完了しました。次に README.md の「プラットフォーム設定」を 1 回だけ適用してください：
  - Android: minSdkVersion を 21 以上に
  - iOS:     Info.plist に NSCameraUsageDescription、Podfile を iOS 13.0 + PERMISSION_CAMERA=1

その後、実機で:
  flutter run
EOS
