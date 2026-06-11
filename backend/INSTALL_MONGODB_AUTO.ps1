# MongoDB Auto Installer for Windows
# Run as Administrator

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MongoDB Auto Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: Please run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell -> Run as Administrator" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Step 1: Downloading MongoDB..." -ForegroundColor Green
$mongoUrl = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.5-signed.msi"
$mongoInstaller = "$env:TEMP\mongodb-installer.msi"

try {
    Invoke-WebRequest -Uri $mongoUrl -OutFile $mongoInstaller -UseBasicParsing
    Write-Host "✅ Downloaded successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed. Please download manually from:" -ForegroundColor Red
    Write-Host "https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
Write-Host "Step 2: Installing MongoDB..." -ForegroundColor Green
Write-Host "This will take 2-3 minutes..." -ForegroundColor Yellow

# Install MongoDB
Start-Process msiexec.exe -ArgumentList "/i `"$mongoInstaller`" /qn /norestart ADDLOCAL=`"ServerService,Client`" SHOULD_INSTALL_COMPASS=`"0`"" -Wait

Write-Host "✅ MongoDB installed!" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Starting MongoDB service..." -ForegroundColor Green

# Start MongoDB service
Start-Service MongoDB -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Check service status
$service = Get-Service MongoDB -ErrorAction SilentlyContinue

if ($service.Status -eq "Running") {
    Write-Host "✅ MongoDB is running!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Starting MongoDB manually..." -ForegroundColor Yellow
    net start MongoDB
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update .env file (already done)" -ForegroundColor White
Write-Host "2. Populate database using Compass" -ForegroundColor White
Write-Host "3. Restart your backend server" -ForegroundColor White
Write-Host ""

# Clean up
Remove-Item $mongoInstaller -Force -ErrorAction SilentlyContinue

Write-Host "Press any key to exit..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
