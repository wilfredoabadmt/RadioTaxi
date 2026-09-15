# Guía de Migraciones de Base de Datos (Prisma & PostgreSQL)

Esta guía documenta el flujo de versionado y aplicación de migraciones de base de datos para la plataforma **RadioTaxi SaaS**.

---

## 1. Arquitectura de Datos y Migraciones

La plataforma utiliza **Prisma ORM** con **PostgreSQL**.
El esquema canónico vive en:
`services/api/prisma/schema.prisma`

Las migraciones versionadas se registran cronológicamente en:
`services/api/prisma/migrations/`
- `0_init_unified/`: Migración inicial de línea base (tablas, claves foráneas, índices y triggers).
- `20260915_enums_and_states/`: Migración a Enums nativos de PostgreSQL (`UserRole`, `DriverStatus`, `VehicleStatus`, `TripRequestStatus`, `TripStatus`, `PaymentMethod`).

---

## 2. Enums Nativos de PostgreSQL

Para evitar errores de tipografía y "strings mágicos", los estados de ciclo de vida se validan a nivel de motor de base de datos:

| Enum | Valores Permitidos | Tablas / Columnas |
|---|---|---|
| `UserRole` | `USER`, `DRIVER`, `DISPATCHER`, `ADMIN` | `User.role` |
| `DriverStatus` | `available`, `busy`, `offline` | `Driver.status` |
| `VehicleStatus` | `available`, `busy`, `offline` | `Vehicle.status` |
| `TripRequestStatus` | `PENDING`, `ACCEPTED`, `COMPLETED`, `CANCELLED` | `TripRequest.status` |
| `TripStatus` | `ASSIGNED`, `ARRIVED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | `Trip.status` |
| `PaymentMethod` | `cash`, `card`, `qr_bolivia`, `corporate_account` | `Trip.paymentMethod` |

---

## 3. Flujo de Trabajo en Desarrollo

### 3.1. Modificar el Esquema
Edita `services/api/prisma/schema.prisma` con los nuevos modelos, campos o índices.

### 3.2. Validar el Esquema
```bash
npm run prisma:generate --workspace=services-api
# o directamente:
cd services/api
npx prisma validate
npx prisma generate
```

### 3.3. Crear una Nueva Migración Versionada
Cuando tengas la base de datos local (Postgres) levantada:
```bash
npx prisma migrate dev --name <descripcion_cambio>
```
Este comando:
1. Compara el esquema con el estado actual de la base de datos.
2. Genera un nuevo directorio numerado en `prisma/migrations/<timestamp>_<descripcion>/migration.sql`.
3. Aplica la migración a la base de datos local.
4. Regenera automáticamente el cliente `@prisma/client`.

---

## 4. Despliegue en Producción (CI/CD o Coolify)

En entornos de producción o staging, **NUNCA** se ejecuta `prisma migrate dev`.
En su lugar, se aplica el historial versionado de forma determinista y segura:

```bash
npx prisma migrate deploy
```

Este comando:
- Verifica la tabla de control `_prisma_migrations`.
- Ejecuta en orden solo las migraciones pendientes.
- Falla de inmediato si detecta alguna migración alterada o conflicto de integridad.

---

## 5. Seed de Datos Iniciales

Para poblar la base de datos con una empresa de prueba (La Paz, Bolivia), conductores, despachadores, reglas de tarificación y geocercas:
```bash
npm run prisma:seed --workspace=services-api
```
El script `seed.ts` es idempotente (usa `upsert`), por lo que puede ejecutarse múltiples veces sin duplicar registros.
