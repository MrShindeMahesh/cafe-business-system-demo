@echo off
title La Casa POS
color 0A
echo.
echo   ========================================
echo          La Casa POS - Starting...
echo   ========================================
echo.
echo   Do not close this window while using the POS.
echo   Open your browser and go to: http://localhost:4000
echo.
echo   Press Ctrl+C to stop the server.
echo   ========================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH.
    echo Please install Node.js v22.5+ from https://nodejs.org
    pause
    exit /b 1
)

echo Checking database...
node server/db.js

echo.
echo Starting server...
node server/server.js