@echo off
setlocal
cd /d "%~dp0"

echo ==========================================
echo   Personal Brain - Setup and Start
echo ==========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js not found.
  echo Please install Node.js from https://nodejs.org/ and run this again.
  echo.
  pause
  exit /b
)
echo [OK] Node.js found.

REM --- Stop any old server so port 3000 is free (prevents port 3002 / stale errors) ---
echo [SETUP] Stopping any old server (freeing port 3000)...
taskkill /F /IM node.exe >nul 2>&1

if not exist "node_modules\.bin\next.cmd" (
  echo [SETUP] node_modules missing. Installing... this may take 1-2 minutes.
  call npm install
) else (
  echo [OK] node_modules present.
)

if exist ".env.local" (
  echo [OK] .env.local present. Saving a backup.
  copy /Y ".env.local" ".env.local.backup" >nul
) else (
  if exist ".env.local.backup" (
    echo [SETUP] .env.local missing. Restoring from backup.
    copy /Y ".env.local.backup" ".env.local" >nul
  ) else (
    echo [WARN] .env.local is missing and no backup exists.
    echo        Create .env.local from env.local.template before login will work.
  )
)

if exist "C:\Program Files\VOICEVOX\VOICEVOX.exe" (
  echo [START] Launching VOICEVOX (minimized).
  start "" /min "C:\Program Files\VOICEVOX\VOICEVOX.exe"
)

echo [START] Starting Personal Brain server...
start "Personal Brain Server" cmd /k "npm run dev"

echo Waiting for the server to be ready...
timeout /t 15 /nobreak >nul
start "" http://localhost:3000

echo.
echo Done. Keep the black "Personal Brain Server" window open while using the app.
endlocal
