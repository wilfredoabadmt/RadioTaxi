@echo off
REM Script para iniciar el RadioTaxi platform en desarrollo (Windows)

echo.
echo Starting RadioTaxi Platform...
echo.

REM Inicia la API
cd services\api
echo [1/2] Starting API on http://localhost:3000...
start "RadioTaxi API" npm run dev

REM Espera un poco
timeout /t 3 /nobreak

REM Inicia el dashboard
cd ..\..\apps\dispatch-dashboard
echo [2/2] Starting Dashboard on http://localhost:3000...
start "RadioTaxi Dashboard" npm run dev

echo.
echo Dashboard: http://localhost:3000
echo API: http://localhost:3000/api
echo.
pause
