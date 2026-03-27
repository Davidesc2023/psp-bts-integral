@echo off
cd /d "%~dp0"
"%~dp0node-portable\node-v20.11.0-win-x64\node.exe" "%~dp0node_modules\vite\bin\vite.js" --host 0.0.0.0 --port 3000
