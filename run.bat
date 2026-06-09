@echo off
setlocal

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

echo ============================================
echo   MonoClip launcher
echo ============================================
echo.

REM --- Ensure backend\.env exists (backend won't start without JWT_SECRET) ---
if not exist "%BACKEND%\.env" (
    echo backend\.env not found - running first-time setup...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%setup.ps1"
    if errorlevel 1 (
        echo.
        echo Setup failed. Please run setup.ps1 manually and fix any errors.
        pause
        exit /b 1
    )
)

REM --- Ensure frontend dependencies are installed ---
if not exist "%FRONTEND%\node_modules" (
    echo Installing frontend dependencies...
    pushd "%FRONTEND%"
    call npm install
    popd
)

echo.
echo Starting MonoClip Backend (Docker)...
start "MonoClip - Backend" cmd /k "cd /d "%BACKEND%" && docker compose up --build"

echo Starting MonoClip Frontend (Tauri)...
start "MonoClip - Frontend" cmd /k "cd /d "%FRONTEND%" && npm run tauri dev"

echo.
echo Both services are starting in separate windows.
echo   Backend : http://127.0.0.1:8000  (Docker)  -  API docs at /docs
echo   Frontend: the MonoClip window will open automatically
echo.
echo Note: the first run is slow (Docker build + Whisper model download).
echo.
