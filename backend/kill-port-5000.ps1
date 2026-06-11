# Kill process using port 5000
Write-Host "Finding process using port 5000..." -ForegroundColor Yellow

try {
    $connection = Get-NetTCPConnection -LocalPort 5000 -ErrorAction Stop
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId
    
    Write-Host "Found process: $($process.ProcessName) (PID: $processId)" -ForegroundColor Cyan
    Write-Host "Killing process..." -ForegroundColor Yellow
    
    Stop-Process -Id $processId -Force
    
    Write-Host "✓ Process killed successfully!" -ForegroundColor Green
    Write-Host "You can now start the backend server." -ForegroundColor Green
}
catch {
    Write-Host "✓ Port 5000 is already free!" -ForegroundColor Green
}
