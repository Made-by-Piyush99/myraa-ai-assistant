@echo off
title MYRAA Jio PC and Jio TV Edition
cls
echo ========================================================
echo   🌸 Starting MYRAA Jio PC & Jio TV Set-Top Box Edition
echo ========================================================
echo.
cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [ERROR] Node.js is not installed or not in PATH!
  echo Please install Node.js from https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing lightweight dependencies...
  call npm install
)

echo.
echo Launching MYRAA TV Server on port 3005...
echo Once running, open this URL on your Jio Set-Top Box or JioPC:
echo.
echo   http://localhost:3005
echo.
node server.js
pause
