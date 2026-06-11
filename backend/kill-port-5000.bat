@echo off
echo Finding process using port 5000...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000') do (
    echo Found process with PID: %%a
    echo Killing process...
    taskkill /PID %%a /F
    echo.
    echo Process killed successfully!
    echo You can now start the backend server.
    goto :end
)

echo Port 5000 is already free!

:end
pause
