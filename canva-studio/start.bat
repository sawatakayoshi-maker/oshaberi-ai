@echo off
chcp 65001 >nul
title Canva Studio - Local Server
echo ============================================
echo   Canva Studio をローカルで起動します...
echo ============================================
echo.

cd /d "%~dp0"

set PORT=8000

rem --- Python があればローカルサーバーで起動（推奨：コピー機能などが安定動作） ---
where python >nul 2>nul
if %errorlevel%==0 (
    echo Python を検出しました。 http://localhost:%PORT%/ で起動します。
    start "" "http://localhost:%PORT%/index.html"
    python -m http.server %PORT%
    goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
    echo Python(py launcher) を検出しました。 http://localhost:%PORT%/ で起動します。
    start "" "http://localhost:%PORT%/index.html"
    py -m http.server %PORT%
    goto :eof
)

rem --- Python が無い場合はファイルを直接ブラウザで開く ---
echo Python が見つからないため、ファイルを直接ブラウザで開きます。
echo （ローカルサーバーを使う場合は Python をインストールしてください）
start "" "%~dp0index.html"
echo.
echo このウィンドウは閉じて構いません。
pause
