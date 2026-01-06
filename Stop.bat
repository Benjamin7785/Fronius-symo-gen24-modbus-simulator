@echo off
title Stop Fronius Simulator
color 0C
echo ========================================
echo Stopping Fronius Gen24 Modbus Simulator
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul

if errorlevel 1 (
    echo No Node.js processes found.
) else (
    echo All Node.js processes stopped successfully!
)

echo.
echo ========================================
echo Simulator stopped!
echo ========================================
echo.
echo You can now safely close this window
echo or run Start.bat to restart.
echo.

pause

