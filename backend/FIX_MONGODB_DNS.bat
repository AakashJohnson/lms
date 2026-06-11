@echo off
echo ========================================
echo MongoDB Atlas DNS Fix
echo ========================================
echo.
echo This will:
echo 1. Flush DNS cache
echo 2. Add Google DNS as backup
echo 3. Restart network adapter
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo [1/3] Flushing DNS cache...
ipconfig /flushdns

echo.
echo [2/3] Registering DNS...
ipconfig /registerdns

echo.
echo [3/3] Renewing IP...
ipconfig /renew

echo.
echo ========================================
echo Done! Now restart your server:
echo   npm run dev
echo ========================================
pause
