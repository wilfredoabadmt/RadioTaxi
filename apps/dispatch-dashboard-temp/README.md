# Dispatch Dashboard

Dashboard web para operadoras de RadioTaxi.

## Uso

- Ejecuta el backend API en `services/api`
- Define `NEXT_PUBLIC_API_URL` en `.env.local` si tu API no corre en `http://localhost:3000/api`
- Ejecuta `npm run dev` desde este directorio

## Notas

La página principal consume:

- `GET /api/trip-requests`
- `GET /api/vehicles`
- `GET /api/reports/corporate`
