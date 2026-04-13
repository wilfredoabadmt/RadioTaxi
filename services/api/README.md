# API Service

Servicio principal para la API REST y la lógica de negocio central. Contiene la base para NestJS y la conexión a la base de datos PostgreSQL.

## Configuración rápida

Copia `.env.example` a `.env` y ajusta la cadena de conexión:

```env
DATABASE_URL=postgresql://radiotaxi:radiotaxi@localhost:5432/radiotaxi
```

## Scripts

- `npm run dev` - ejecutar en modo desarrollo
- `npm run build` - compilar TypeScript
- `npm run start` - iniciar la aplicación compilada

## Estructura inicial

- `src/main.ts` - arranque de NestJS
- `src/app.module.ts` - importación de módulos globales
- `src/prisma` - servicio Prisma y módulo
- `src/users` - módulo de ejemplo de usuarios
- `src/trips` - módulo de viajes y despacho básico

## Rutas iniciales

- `GET /api/users`
- `GET /api/vehicles`
- `GET /api/trip-requests`
- `POST /api/trip-requests`
- `GET /api/trips`
- `POST /api/trips/dispatch/:requestId`
- `GET /api/pricing/rules?companyId=`
- `GET /api/pricing/geofences?companyId=`
- `POST /api/pricing/calculate`
- `GET /api/maps/geocode?address=...`
- `POST /api/maps/directions`
- `GET /api/trip-fares`
- `GET /api/trip-fares/:id`
- `POST /api/trip-fares`
- `GET /api/reports/corporate`
- `GET /api/reports/corporate/:id`
- `GET /api/reports/corporate/download/:id`
- `POST /api/reports/corporate`

## Geofencing

El cálculo de tarifa ahora evalúa geofences activos de la empresa y aplica recargos si el origen o destino del viaje cae dentro de un área especial.

## Trip fares

El endpoint `POST /api/trip-fares` permite almacenar la tarifa final de un viaje después de calcularla y enlazarla al `Trip` y a la regla de tarificación usada.

## Despacho

El endpoint `POST /api/trips/dispatch/:requestId` selecciona el chofer disponible más cercano usando coordenadas GPS del `TripRequest` y la ubicación actual del chofer.
