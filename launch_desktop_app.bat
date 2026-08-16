@echo off
title TCT Speeds & Feeds Desktop App
cd /d "%~dp0"
if exist "%~dp033280_20260703_0835.exe" (
    start "" "%~dp033280_20260703_0835.exe"
) else (
    start "" python "%~dp033280_20260703_0835.py"
)
exit
