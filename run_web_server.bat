@echo off
title TCT Feeds & Speeds Local Server
echo =======================================================
echo   Starting TCT Feeds & Speeds Local Web Server...
echo   Serving directory: %~dp0web_app
echo   URL: http://localhost:8000
echo =======================================================
echo.
cd /d "%~dp0web_app"
start "" http://localhost:8000
python -m http.server 8000
pause
