@echo off
setlocal

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo Starting MonoClip Backend (Docker)...
start "MonoClip - Backend" cmd /k "cd /d "%BACKEND%" && docker compose up --build"

echo Starting MonoClip Frontend...
start "MonoClip - Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

echo.
echo Both services are starting in separate windows.
echo   Backend : http://127.0.0.1:8000  (Docker)
echo   Frontend: Tauri window will open automatically
echo.
