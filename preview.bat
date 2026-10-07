@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GeoBid - local preview

where node >nul 2>nul
if errorlevel 1 (
  echo  Node.js is not installed: https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)

call npm install
if errorlevel 1 goto :err
call npx -y netlify-cli login
if not exist ".netlify\state.json" call npx -y netlify-cli link

echo.
echo  Local preview: http://localhost:8888   (close this window to stop)
call npx -y netlify-cli dev
exit /b 0

:err
echo  ERROR - see the messages above.
pause
exit /b 1
