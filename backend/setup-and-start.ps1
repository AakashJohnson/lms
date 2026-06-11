# NCUI CEAS LMS - Complete Setup Script (PowerShell)
# This script will:
# 1. Check MongoDB service
# 2. Start MongoDB if not running
# 3. Create test users in database
# 4. Start the backend server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NCUI CEAS LMS - Complete Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check MongoDB service
Write-Host "[1/5] Checking MongoDB service..." -ForegroundColor Yellow
try {
    $mongoService = Get-Service -Name MongoDB -ErrorAction Stop
    Write-Host "[SUCCESS] MongoDB service found: $($mongoService.Status)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] MongoDB service not found!" -ForegroundColor Red
    Write-Host "Please complete MongoDB installation first." -ForegroundColor Red
    Write-Host "Installation guide: MONGODB_LOCAL_SETUP.md" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Step 2: Start MongoDB service
Write-Host "[2/5] Starting MongoDB service..." -ForegroundColor Yellow
if ($mongoService.Status -ne 'Running') {
    try {
        Start-Service -Name MongoDB -ErrorAction Stop
        Write-Host "[SUCCESS] MongoDB service started" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to start MongoDB service" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "[INFO] MongoDB service already running" -ForegroundColor Green
}

# Step 3: Wait for MongoDB to be ready
Write-Host "[3/5] Waiting for MongoDB to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test MongoDB connection
Write-Host "[3/5] Testing MongoDB connection..." -ForegroundColor Yellow
$testConnection = Test-NetConnection -ComputerName localhost -Port 27017 -InformationLevel Quiet -WarningAction SilentlyContinue
if ($testConnection) {
    Write-Host "[SUCCESS] MongoDB is accessible on port 27017" -ForegroundColor Green
} else {
    Write-Host "[WARNING] Cannot connect to MongoDB on port 27017" -ForegroundColor Yellow
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

# Step 4: Create test users
Write-Host "[4/5] Creating test users in database..." -ForegroundColor Yellow
Write-Host ""
try {
    node create-test-users.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Test users created successfully" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "[ERROR] Failed to create test users" -ForegroundColor Red
        Write-Host "Please check if MongoDB is running properly" -ForegroundColor Yellow
        Read-Host "Press Enter to continue anyway"
    }
} catch {
    Write-Host "[ERROR] Failed to run create-test-users.js" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Read-Host "Press Enter to continue anyway"
}

# Step 5: Start backend server
Write-Host ""
Write-Host "[5/5] Starting backend server..." -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete! Server starting..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Admin:   admin@ncui.in / Admin@123" -ForegroundColor White
Write-Host "  Trainer: trainer@ncui.in / Trainer@123" -ForegroundColor White
Write-Host "  Student: student@ncui.in / Student@123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start the server
npm run dev
