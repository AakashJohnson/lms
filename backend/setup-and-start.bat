@echo off
echo ========================================
echo NCUI CEAS LMS - Complete Setup Script
echo ========================================
echo.

REM Check if MongoDB service exists
echo [1/5] Checking MongoDB service...
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] MongoDB service not found!
    echo Please complete MongoDB installation first.
    pause
    exit /b 1
)

REM Check if MongoDB service is running
echo [2/5] Starting MongoDB service...
net start MongoDB >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] MongoDB service started
) else (
    echo [INFO] MongoDB service already running
)

REM Wait for MongoDB to be ready
echo [3/5] Waiting for MongoDB to be ready...
timeout /t 3 /nobreak >nul

REM Create test users
echo [4/5] Creating test users in database...
node create-test-users.js
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create test users
    echo Please check if MongoDB is running properly
    pause
    exit /b 1
)

echo.
echo [5/5] Starting backend server...
echo.
echo ========================================
echo Setup Complete! Server starting...
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Test Credentials:
echo   Admin:   admin@ncui.in / Admin@123
echo   Trainer: trainer@ncui.in / Trainer@123
echo   Student: student@ncui.in / Student@123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the server
npm run dev
