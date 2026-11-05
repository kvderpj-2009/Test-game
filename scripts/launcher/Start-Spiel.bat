@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Bitte zuerst Node.js 22.12 oder neuer von https://nodejs.org installieren.
 pause
 exit /b 1
)
node "%~dp0start.mjs"
pause
