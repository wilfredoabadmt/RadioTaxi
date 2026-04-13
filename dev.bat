@echo off
REM Inicia API y Dashboard en paralelo (Windows)

echo.
echo Starting RadioTaxi Backend + Dashboard...
echo.

REM Mata procesos previos en los puertos (opcional)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /pid %%a /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /pid %%a /f >nul 2>&1

timeout /t 1 /nobreak >nul

REM Inicia API
cd services\api
start "RadioTaxi API (3000)" cmd /k "npm run dev"

REM Espera a que la API inicie
timeout /t 3 /nobreak >nul

REM Inicia Dashboard
cd ..\..\apps\dispatch-dashboard
start "RadioTaxi Dashboard (3001)" cmd /k "npm run dev"

echo.
echo Dashboard: http://localhost:3001
echo API: http://localhost:3000/api
echo.
pause
