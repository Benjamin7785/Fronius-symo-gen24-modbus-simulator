@echo off
echo ================================================
echo Fronius Gen24 Modbus Simulator - Installation
echo ================================================
echo.

echo Installing root dependencies...
call npm install
if errorlevel 1 goto error

echo.
echo Installing backend dependencies...
cd backend
call npm install
if errorlevel 1 goto error
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if errorlevel 1 goto error
cd ..

echo.
echo ================================================
echo Installation completed successfully!
echo ================================================
echo.
echo To start the simulator:
echo   npm run dev        (runs both frontend and backend)
echo   npm run dev:backend (runs backend only)
echo   npm run dev:frontend (runs frontend only)
echo.
echo Backend will be available at: http://localhost:3001
echo Frontend will be available at: http://localhost:3000
echo Modbus TCP will be available at: Port 502 (Device ID: 1)
echo.
pause
exit /b 0

:error
echo.
echo ================================================
echo ERROR: Installation failed!
echo ================================================
echo.
pause
exit /b 1


