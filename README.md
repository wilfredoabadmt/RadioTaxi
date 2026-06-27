# RadioTaxi SaaS Platform

Plataforma SaaS para modernizar flotas tradicionales de radiotaxi con despacho en tiempo real, VoIP, tarificación dinámica y gestión B2B.

## Estructura inicial

- `apps/` - aplicaciones de cliente y dashboard
- `services/` - backend modular para API, tiempo real, tarificación, corporate y telefonía
- `packages/` - librerías compartidas de tipos, utilidades y esquema de base de datos
- `infrastructure/` - scripts de despliegue e infraestructura

## Inicio rápido

### 1. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### 2. Configurar variables de entorno

```bash
# Backend API
cp services/api/.env.example services/api/.env

# Dashboard
cp apps/dispatch-dashboard/.env.example apps/dispatch-dashboard/.env.local
```

### 3. Iniciar en desarrollo

**Opción A: Script automatizado** (recomendado)

- Windows: `./dev.bat`
- Linux/Mac: `./dev.sh`

**Opción B: Dos terminales** 

```bash
# Terminal 1: API (puerto 3000)
cd services/api
npm run dev

# Terminal 2: Dashboard (puerto 3001)
cd apps/dispatch-dashboard
npm run dev
```

**Opción C: Desde raíz** 

```bash
npm run dev
```

### 4. Acceder al dashboard

- Dashboard: **http://localhost:3001**
- API: **http://localhost:3000/api**

## Base de datos

El esquema vive en `services/api/prisma/schema.prisma` (origen único de verdad).
La migración baseline está en `services/api/prisma/migrations/0_init_unified/`.

### Aplicar el esquema

```bash
cd services/api
# 1. Regenerar el cliente Prisma (si se edita el schema)
npm run prisma:generate

# 2. Crear/migrar la base de datos (requiere PostgreSQL activo en DATABASE_URL)
npm run prisma:migrate
# o, en producción:
npx prisma migrate deploy
```

### Geometría

Las ubicaciones (vehículos, geofences, orígenes/destinos) se almacenan como
`Float` lat/lng, consistente con servicios, frontend y realtime.
PostGIS queda como opcional para futuras consultas espaciales avanzadas.

## Estados

| Entidad | Valores |
|---|---|
| Vehicle / Driver | `available` \| `busy` \| `offline` |
| TripRequest | `PENDING` \| `ACCEPTED` \| `COMPLETED` \| `CANCELLED` |
| Trip | `ASSIGNED` \| `IN_PROGRESS` \| `COMPLETED` \| `CANCELLED` |

## Próximos pasos

1. ~~Instalar PostgreSQL y ejecutar schema.sql~~ → usar `prisma migrate` (ver arriba)
2. Configurar Asterisk para VoIP
3. Conectar el servicio realtime a la base de datos (reemplazar datos mock)
4. Implementar autenticación y seguridad (JWT + roles)
