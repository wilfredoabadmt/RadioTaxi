#!/bin/bash
# Script para iniciar el RadioTaxi platform en desarrollo

echo "🚀 Iniciando RadioTaxi Platform..."
echo ""

# Inicia la API en segundo plano
cd services/api
echo "📡 Iniciando API en http://localhost:3000"
npm run dev &
API_PID=$!

# Espera un poco para que la API inicie
sleep 3

# Inicia el dashboard
cd ../../apps/dispatch-dashboard
echo "🎨 Iniciando Dashboard en http://localhost:3000 (o 3001)"
npm run dev &
DASHBOARD_PID=$!

echo ""
echo "✅ Plataforma iniciada"
echo "📱 Dashboard: http://localhost:3000"
echo "📡 API: http://localhost:3000/api"
echo ""
echo "Presiona Ctrl+C para detener"

# Espera indefinidamente
wait
