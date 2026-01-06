@echo off
title Fronius Gen24 Modbus Simulator
color 0A
echo ========================================
echo Fronius Gen24 Modbus Simulator v1.1.2
echo ========================================
echo.
echo Starting Backend and Frontend...
echo.
echo Backend API:     http://localhost:3001
echo Web UI:          http://localhost:3000
echo Modbus TCP:      Port 503 (Device ID: 1)
echo.
echo ========================================
echo IMPORTANT: Click START button in Web UI
echo           to enable Modbus server!
echo ========================================
echo.
echo Your network IP will be shown in Web UI
echo Configure EDMM-20 to: [Your IP]:503
echo.
echo Press Ctrl+C to stop the simulator
echo ========================================
echo.

npm run dev

pause

