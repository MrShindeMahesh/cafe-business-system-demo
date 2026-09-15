@echo off
title La Casa POS - Server
cd /d "%~dp0"
if not exist node_modules (
  echo.
  echo  First run: installing dependencies, please wait 2-3 minutes...
  echo.
  call npm install --no-audit --no-fund
)
start "" cmd /c "timeout /t 4 /nobreak >nul & if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "http://localhost:4000") else (start "" "http://localhost:4000")"
cls
echo  ==============================================
echo    LA CASA POS  -  SERVER IS RUNNING
echo.
echo    Chrome opens automatically in a moment.
echo    Keep this window OPEN while the shop runs.
echo    Closing this window STOPS the server.
echo  ==============================================
echo.
node server\server.js
pause
