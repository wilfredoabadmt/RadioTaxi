@echo off
REM Inicia API, Realtime y Dashboard en paralelo (Windows)

echo.
echo ========================================================
echo   Iniciando RadioTaxi SaaS Platform (API + Realtime + Dashboard)
echo ========================================================
echo.

REM Mata procesos previos en los puertos (opcional)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /pid %%a /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do taskkill /pid %%a /f >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do taskkill /pid %%a /f >nul 2>&1

timeout /t 1 /nobreak >nul

REM Inicia API (Puerto 3000)
cd services\api
start "RadioTaxi API (3000)" cmd /k "npm run dev"

REM Inicia Realtime (Puerto 3002)
cd ..\realtime
start "RadioTaxi Realtime (3002)" cmd /k "npm run dev"

REM Espera a que los servicios backend inicien
timeout /t 3 /nobreak >nul

REM Inicia Dashboard (Puerto 3001)
cd ..\..\apps\dispatch-dashboard
start "RadioTaxi Dashboard (3001)" cmd /k "npm run dev"

cd ..\..

echo.
echo ========================================================
echo   Plataforma RadioTaxi Lista:
echo   - Dashboard:        http://localhost:3001
echo   - API REST:         http://localhost:3000/api
echo   - Swagger Docs:     http://localhost:3000/docs
echo   - Realtime Socket:  http://localhost:3002
echo ========================================================
echo.
pause
