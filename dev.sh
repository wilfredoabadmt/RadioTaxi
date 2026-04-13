#!/bin/bash
# Inicia API y Dashboard en paralelo

echo "🚀 Iniciando RadioTaxi Backend + Dashboard"
echo ""

# Mata procesos previos en los puertos
lsof -i :3000 | grep -v COMMAND | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
lsof -i :3001 | grep -v COMMAND | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true

sleep 1

# Inicia en segundo plano
cd services/api && npm run dev &
API_PID=$!

sleep 2

cd ../../apps/dispatch-dashboard && npm run dev &
DASHBOARD_PID=$!

echo ""
echo "✅ Servicios iniciados"
echo "   API: http://localhost:3000/api"
echo "   Dashboard: http://localhost:3001"
echo ""
echo "PIDs: API=$API_PID, Dashboard=$DASHBOARD_PID"

wait
