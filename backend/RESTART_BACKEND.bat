@echo off
echo ========================================
echo   RESTARTING BACKEND SERVER
echo ========================================
echo.

echo [1/4] Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul
if %errorlevel% equ 0 (
    echo     ✓ Node processes stopped
) else (
    echo     ℹ No Node processes were running
)

echo.
echo [2/4] Waiting 2 seconds...
timeout /t 2 /nobreak >nul
echo     ✓ Ready to start

echo.
echo [3/4] Starting backend server...
echo.

start cmd /k "npm start"

echo.
echo [4/4] Backend server starting in new window...
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Wait for "Server running on port 5000" in new window
echo 2. Go to browser
echo 3. Press Ctrl + Shift + R to refresh
echo 4. Check QMS page
echo 5. Student names should now appear!
echo.
echo ========================================
echo.
pause
