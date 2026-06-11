@echo off
echo ========================================
echo   Restarting Backend Server
echo ========================================
echo.

echo Stopping any running Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting backend server...
echo.

npm start
