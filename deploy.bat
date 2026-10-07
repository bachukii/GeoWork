@echo off
chcp 65001 >nul
cd /d "%~dp0"
title GeoBid - Netlify deploy

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js is not installed.
  echo  Install the LTS version from https://nodejs.org and run this file again.
  echo.
  start https://nodejs.org
  pause
  exit /b 1
)

echo.
echo  [1/4] Installing packages (first time takes a few minutes)...
call npm install
if errorlevel 1 goto :err

echo.
echo  [2/4] Netlify login (a browser window may open - click Authorize)...
call npx -y netlify-cli login
if errorlevel 1 goto :err

if not exist ".netlify\state.json" (
  echo.
  echo  [3/4] Link this folder to your Netlify site - choose "geobid"...
  call npx -y netlify-cli link
  if errorlevel 1 goto :err
) else (
  echo.
  echo  [3/4] Already linked to Netlify.
)

echo.
echo  [4/4] Building and publishing to the live site...
call npx -y netlify-cli deploy --build --prod
if errorlevel 1 goto :err

echo.
echo  DONE. The site is live.
pause
exit /b 0

:err
echo.
echo  ERROR - see the messages above. Send a screenshot to Claude.
pause
exit /b 1
