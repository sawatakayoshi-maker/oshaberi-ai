#!/usr/bin/env bash
# Canva Studio — local launcher (macOS / Linux / WSL)
set -e
cd "$(dirname "$0")"
PORT=8000
URL="http://localhost:${PORT}/index.html"

echo "============================================"
echo "  Canva Studio をローカルで起動します..."
echo "  ${URL}"
echo "============================================"

# Open browser (best-effort, cross-platform)
( sleep 1
  if command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"
  elif command -v open >/dev/null 2>&1; then open "$URL"
  elif command -v wslview >/dev/null 2>&1; then wslview "$URL"
  fi ) >/dev/null 2>&1 &

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then
  python -m http.server "$PORT"
else
  echo "Python が見つかりません。ブラウザで index.html を直接開いてください。"
fi
