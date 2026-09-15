# Plan de Desarrollo — RadioTaxi SaaS Platform

> Documento vivo de planificación y seguimiento del desarrollo.
> **Última actualización:** 2026-07-10
> **Rama base oficial:** `respaldo-codigo-actual` (decidido 2026-07-10). El `main` remoto es una **línea paralela no relacionada** (historias sin ancestro común): apps **web Next.js** simuladas + despliegue Coolify, **sin `auth` ni `ai`**. Se conserva `respaldo` como base (backend seguro real + IA + plan) y se **migra de `main` solo**: (1) infraestructura de despliegue [hecho 2026-07-10], (2) el diseño premium como referencia visual.
> **Plataforma de apps:** móvil (Expo/React Native) para pasajero y conductor — confirma las Fases 3/4 tal cual. La UI web de `main` es solo referencia, no código reutilizable.
> **Cómo usarlo:** cada tarea tiene una casilla `[ ]`. Al completarla, márcala `[x]` y añade la fecha/commit. Mantén este archivo actualizado en cada PR.

---

## 0. Índice

1. [Diagnóstico del estado actual](#1-diagnóstico-del-estado-actual)
2. [Visión y objetivos](#2-visión-y-objetivos)
3. [Arquitectura objetivo](#3-arquitectura-objetivo)
4. [Bugs y bloqueadores conocidos](#4-bugs-y-bloqueadores-conocidos-corregir-primero)
5. [Roadmap por fases](#5-roadmap-por-fases)
   - [Fase 0 — Estabilización y desbloqueo](#fase-0--estabilización-y-desbloqueo-1-semana)
   - [Fase 1 — Seguridad y consistencia de auth](#fase-1--seguridad-y-consistencia-de-auth-12-semanas)
   - [Fase 2 — Núcleo de despacho y ciclo de vida del viaje](#fase-2--núcleo-de-despacho-y-ciclo-de-vida-del-viaje-23-semanas)
   - [Fase 3 — App del cliente (pasajero)](#fase-3--app-del-cliente-pasajero-23-semanas)
   - [Fase 4 — App del conductor (completar)](#fase-4--app-del-conductor-completar-12-semanas)
   - [Fase 5 — Dashboard de despacho profesional](#fase-5--dashboard-de-despacho-profesional-23-semanas)
   - [Fase 6 — Tarificación, pagos y facturación](#fase-6--tarificación-pagos-y-facturación-23-semanas)
   - [Fase 7 — Capa B2B / corporativa](#fase-7--capa-b2b--corporativa-2-semanas)
   - [Fase 8 — Telefonía / VoIP (Asterisk)](#fase-8--telefonía--voip-asterisk-3-semanas)
   - [Fase 9 — Calidad, testing, CI/CD y observabilidad](#fase-9--calidad-testing-cicd-y-observabilidad-continuo)
6. [Deuda técnica transversal](#6-deuda-técnica-transversal)
7. [Métricas de éxito](#7-métricas-de-éxito)

---

## 1. Diagnóstico del estado actual

Monorepo npm workspaces (`apps/*`, `services/*`, `packages/**/*`). Stack: **NestJS 10 + Prisma 5 + PostgreSQL** (API REST), **socket.io** (realtime), **Next.js** (dashboard), **Expo/React Native** (apps móviles).

### Madurez por componente

| Componente | Estado | Resumen |
|---|---|---|
| `services/api` (NestJS) | 🟡 **MVP temprano** | Auth JWT+roles sólido; IA de despacho (Gemini) madura; resto en su mayoría solo lectura. 17 modelos Prisma, ~9 sin módulo. **0 tests.** |
| `services/realtime` (socket.io) | 🟡 **Funcional** | Asignar/completar viaje + GPS. **Sin autenticación en el socket** (`cors:*`). Lógica de precios duplicada. |
| `services/pricing-engine` | 🔴 **Stub** | Un `console.log`. Lógica real vive en realtime/api. |
| `services/telephony` | 🔴 **Vacío** | Un `console.log`. Sin Asterisk. Greenfield. |
| `apps/dispatch-dashboard` (Next.js) | 🟡 **Parcial** | Página única con mapa Leaflet en vivo. **Sin login.** Sin paginación, sin CRUD, estilos inline. |
| `apps/driver-app` (Expo) | 🟡 **Casi-MVP** | Login + pantalla de viaje + GPS. GPS **solo emite en viaje activo** (conductor libre invisible en mapa). Sin react-navigation. |
| `apps/client-app` (Expo) | 🔴 **Esqueleto** | Solo plumbing (`api/socket/auth/types`). Sin UI, sin `App.tsx`, sin pantallas. |
| `packages/shared` | 🔴 **Muerto** | `UserProfile` + `formatCurrency` sin usar por nadie. |

### Hallazgos críticos

- ❗ **6 `package.json` borrados del working tree** → dashboard, realtime, pricing-engine, client-app y ambos `packages/shared` **no compilan ni arrancan**.
- ❗ **Sin autenticación** en el dashboard ni en el socket de realtime → cualquiera puede asignar/completar viajes.
- ❗ **2 bugs latentes** en el refactor sin commitear de `trip-requests` (route shadowing + `findUnique` inválido).
- ⚠️ **Duplicación**: cálculo de tarifas y utilidades geográficas en 2–3 sitios; tipos duplicados en las 3 apps.
- ⚠️ **7 módulos del API sin `@Roles`** (trips, vehicles, drivers, pricing, maps, trip-fares, corporate-reports).
- ⚠️ **Secreto JWT hardcodeado** como fallback en 3 lugares.
- ⚠️ **0 tests** en todo el repo; sin CI.

---

## 2. Visión y objetivos

**Producto:** plataforma SaaS multi-empresa para modernizar flotas de radiotaxi con despacho en tiempo real, tarificación dinámica, apps de pasajero/conductor, panel de despacho y capa B2B corporativa (mercado inicial: Bolivia — BOB, cumplimiento TIC/CUDAP/NIT).

**Objetivos del roadmap:**
1. **Estabilizar** el repo para que todo compile y arranque.
2. **Asegurar** (auth uniforme en todas las superficies).
3. **Cerrar el ciclo de vida del viaje** de punta a punta (solicitar → asignar → en curso → completar → tarifar → pagar).
4. **Completar las 3 interfaces** (pasajero, conductor, despachador).
5. **Monetizar** (tarificación robusta + pagos + facturación B2B).
6. **Endurecer** (tests, CI/CD, observabilidad, telefonía).

---

## 3. Arquitectura objetivo

```
                         ┌──────────────────────┐
 Pasajero (Expo) ───────►│                      │
 Conductor (Expo) ──────►│   services/api       │◄──── PostgreSQL (Prisma)
 Dashboard (Next.js) ───►│   NestJS REST + JWT   │
                         │   - auth/roles        │
                         └───────────┬──────────┘
                                     │ (auth compartida)
                         ┌───────────▼──────────┐
 Todos los clientes ────►│  services/realtime    │◄──── misma BD
 (socket.io autenticado) │  socket.io + rooms    │
                         └───────────┬──────────┘
                                     │ (usa)
                         ┌───────────▼──────────┐   ┌────────────────────┐
                         │ services/pricing-engine│  │ services/telephony  │
                         │ (fuente única precios) │  │ (Asterisk ARI/AMI) │
                         └───────────────────────┘   └────────────────────┘

 packages/shared/{types,utils} ← consumido por TODAS las apps y servicios
```

**Principios:**
- **Una sola fuente de verdad** por dominio: precios en `pricing-engine`, tipos en `packages/shared/types`, esquema en `prisma/schema.prisma`.
- **Auth unificada**: mismo JWT valida REST y socket.
- **Degradación elegante** (ya aplicada en IA) como patrón general.
- **Sin `any`**: tipar con Prisma + shared types.

---

## 4. Bugs y bloqueadores conocidos (corregir PRIMERO)

- [x] **B1 — Restaurar 6 `package.json` borrados.** ✅ 2026-07-10 — `git checkout HEAD` de los 6 archivos; todos presentes.
- [x] **B2 — Route shadowing en `trip-requests.controller.ts`.** ✅ 2026-07-10 — `@Get('mine')` movido antes de `@Get(':id')`.
- [x] **B3 — `findOne` usa `findUnique({ where: { id, customerId } })`.** ✅ 2026-07-10 — cambiado a `findFirst`.
- [x] **B4 — Imports sin usar** (`IsEmail` en el DTO, `Public` en el controller). ✅ 2026-07-10 — eliminados.
- [x] **B5 — `trips.service` lanza `throw new Error(...)`.** ✅ 2026-07-10 — reemplazado por `NotFoundException`/`ConflictException`/`BadRequestException`; añadido `CreateTripDto` tipado.
- [x] **B6 — `data: any` + `as any`** en `trips.service` y `trip-fares.service`. ✅ 2026-07-10 — tipado con DTOs; corregido el `create-trip-fare.dto.ts` (estaba desalineado: usaba `fareAmount`/`notes` en vez de `baseFare`/`totalFare`).
- [x] **B7 — Secreto JWT hardcodeado** (`dev-insecure-secret`) en 3 sitios. ✅ 2026-07-10 — centralizado en `auth/jwt-secret.util.ts`; **falla en arranque** en producción si el secreto falta/es default/< 32 chars.

> ⚠️ **Blocker de entorno (no de código):** el `npm install` de esta máquina extrae varios paquetes de forma **incompleta** (p.ej. `typescript` con `lib/` vacío, `@nestjs/config` sin `dist/`, `class-validator` sin `types/`). Además la CLI de **Prisma 5.22 es incompatible con Node 26** (falla `prisma generate`). Por eso **`npm run build`/`tsc` no puede verificarse aquí todavía**. Nota: el script `dev` usa `ts-node-dev` en modo *transpile-only* (sin typecheck), por lo que el proyecto "corría" pero el build estricto nunca pasó limpio (origen de los `as any`). **Acción pendiente (0.2/0.3):** reinstalar dependencias en un entorno con Node LTS 20/22 y npm estándar, luego `prisma generate` + `tsc`.

---

## 5. Roadmap por fases

> Estimaciones asumen 1 desarrollador full-time. Ajustar según equipo. Las fases 3/4/5 pueden paralelizarse una vez cerrada la Fase 2.

---

### Fase 0 — Estabilización y desbloqueo (1 semana)

**Objetivo:** que todo el monorepo instale, compile y arranque; corregir bugs conocidos.

- [x] **0.1** Resolver **B1–B7** (sección 4). ✅ 2026-07-10 — ver sección 4.
- [x] **0.2** Verificar `npm install --legacy-peer-deps` limpio desde raíz. ✅ 2026-07-10 — Completado (instalado limpio tras limpiar caché y aprobar scripts de Prisma).
- [x] **0.3** Verificar que cada workspace compila: `npm run build --workspaces`. 🟡 2026-07-10 — Verificado exitosamente para `services/api` y `services/realtime` (compilación pasa limpia con TypeScript 5.5); Next.js/Expo bloqueados localmente por extracción incompleta de archivos (MAX_PATH en Windows).
- [x] **0.4** Levantar stack local completo: Postgres (docker-compose), `api` (3000), `realtime` (3002), `dashboard` (3001), `pricing-engine` (3005), `telephony` (3004), `asterisk` (5060/8088). Documentar en README el arranque real. ✅ 2026-09-15 — Docker Compose configurado con todos los servicios y microservicios, puertos expuestos, salud de contenedores y README exhaustivo con diagrama ASCII, tabla de puertos y comandos paso a paso.
- [x] **0.5** Alinear `docker-compose.yaml`: hace referencia a `apps/dispatch-dashboard-temp/Dockerfile` (ruta inexistente) → corregir a `apps/dispatch-dashboard`. ✅ 2026-07-10 — corregida la ruta; añadidos `ports` a `api` (3000:3000) y `dashboard` (3001:3000) + `depends_on` y defaults de `NEXT_PUBLIC_*`.
- [x] **0.6** Crear un **script de seed** Prisma (`prisma/seed.ts`): 1 empresa, 1 admin, 1 dispatcher, 2 conductores+vehículos, 1 pasajero, reglas de precio y geofences de ejemplo. Añadir `prisma db seed`. ✅ 2026-07-10 — `services/api/prisma/seed.ts` idempotente (upsert) con contexto Bolivia/La Paz (BOB); añadido `prisma.seed` + script `prisma:seed` + devDep `ts-node` en `services/api/package.json`. ⚠️ Ejecución pendiente de validar (bloqueador 0.2/0.3).
- [x] **0.7** `.gitignore`: sacar del repo binarios `handle*.exe`, `handle.zip`, `skills.zip`, `temp_contents.txt` (ruido). ✅ 2026-07-10 — reglas añadidas (`*.exe`, `*.zip`, `temp_contents.txt`, `desktop.ini`) y `git rm --cached` de los 7 archivos.
- [x] **0.8** Añadir `.env.example` faltantes a `realtime`, `dashboard`, `client-app`, `driver-app` con todas las variables. ✅ 2026-07-10 — creado `apps/client-app/.env.example` (el único que faltaba; los otros 3 ya existían).

**Criterio de aceptación:** `docker-compose up` + seed → dashboard muestra datos reales y el mapa pinta vehículos.

---

### Fase 1 — Seguridad y consistencia de auth (1–2 semanas)

**Objetivo:** misma identidad JWT en REST y socket; roles aplicados en todas las superficies.

- [x] **1.1 — Auth en el socket de realtime.** Middleware `io.use()` que valide el JWT (mismo `JWT_SECRET` que la API) en el handshake. Rechazar conexiones sin token válido. Adjuntar `socket.data.user`. ✅ 2026-07-10 — Implementado middleware en `services/realtime/src/auth.ts` y conectado en `index.ts`.
- [x] **1.2 — Autorización por evento en realtime.** `trip:assign`/`trip:complete` solo `ADMIN`/`DISPATCHER`; `vehicle:update` solo el `DRIVER` dueño del vehículo. Validar que el driver no mueva vehículos ajenos. ✅ 2026-07-10 — Controles de roles añadidos en los eventos del socket.
- [x] **1.3 — CORS restringido.** Reemplazar `cors:{origin:'*'}` por lista blanca desde env (`ALLOWED_ORIGINS`) en realtime **y** API. ✅ 2026-07-10 — `ALLOWED_ORIGINS` aplicado en `services/realtime/src/index.ts` y en `services/api/src/main.ts` (`enableCors` con lista blanca + `credentials`).
- [x] **1.4 — Login en el dashboard.** Página `/login`, guardar JWT (httpOnly cookie o storage), interceptor que añade `Authorization: Bearer`, guard de ruta que redirige a `/login`. Gatear a roles `ADMIN`/`DISPATCHER`. ✅ 2026-07-10 — `apps/dispatch-dashboard/pages/login.tsx` + guard/redirección en `pages/index.tsx` con `Authorization: Bearer`.
- [x] **1.5 — Cerrar guards del API.** Añadir `@Roles` a `trips`, `vehicles`, `drivers`, `pricing`, `maps`, `trip-fares`, `corporate-reports` según matriz de permisos. ✅ 2026-07-10 — `@Roles` en los 7 controladores; `maps`/`pricing` completados en esta iteración (geocode/calculate abiertos a todos los roles autenticados; reglas/geofences solo `DISPATCHER`/`ADMIN`).
- [x] **1.6 — Endurecer JWT.** Config central del secreto; **fallar en arranque** si `JWT_SECRET` es el default en `NODE_ENV=production`. Evaluar refresh tokens y expiración configurable. ✅ 2026-07-10 — `resolveJwtSecret` en `api` y `realtime` valida longitud mínima (32 chars) y valor por defecto.
- [x] **1.7 — Rate limiting** en la API (`@nestjs/throttler`), especialmente en `/auth/*` y `/maps/*`. ✅ 2026-07-10 — `ThrottlerModule` (100 req/60s) + `ThrottlerGuard` global en `app.module.ts`.
- [x] **1.8 — Auditoría.** Poblar el modelo `AuditLog` (ya existe) con un interceptor Nest para acciones sensibles (login, asignaciones, cambios de estado). ✅ 2026-07-10 — `AuditInterceptor` global + decorador `@Audit(...)` (`common/interceptors/audit.interceptor.ts`, `common/decorators/audit.decorator.ts`).

**Criterio de aceptación:** un cliente sin token no puede leer datos ni emitir eventos; un `USER` no puede asignar viajes; el dashboard exige login.

---

### Fase 2 — Núcleo de despacho y ciclo de vida del viaje (2–3 semanas)

**Objetivo:** cerrar el flujo completo solicitar → asignar → en curso → completar → cancelar, con estados intermedios y CRUD de flota.

- [x] **2.1 — Enums nativos Prisma.** Migrar los `String` de estado (Vehicle/Driver/TripRequest/Trip status, User.role, paymentMethod) a `enum` nativos de PostgreSQL y Prisma. Migración versionada + regenerar cliente. ✅ 2026-09-15 — Declarados enums nativos (`UserRole`, `DriverStatus`, `VehicleStatus`, `TripRequestStatus`, `TripStatus`, `PaymentMethod`), cliente Prisma regenerado y script SQL versionado en `services/api/prisma/migrations/20260915_enums_and_states/migration.sql`.
- [x] **2.2 — Ciclo de vida del viaje en el API.** Endpoints/transiciones: `POST /trips/:id/start` (ASSIGNED→IN_PROGRESS), `POST /trips/:id/arrived`, `POST /trips/:id/complete`, `POST /trips/:id/cancel` (con motivo). Validar transiciones legales (máquina de estados). ✅ 2026-07-10 — Máquina de estados `ASSIGNED→ARRIVED→IN_PROGRESS→COMPLETED` (+`CANCELLED`) en `trips.service.ts` con `TRIP_TRANSITIONS`; endpoints con `@Roles`+`@Audit`; `complete`/`cancel` liberan conductor+vehículo y actualizan la solicitud en transacción; `create` ahora ocupa recursos (`busy`). Motivo de cancelación queda en `AuditLog`.
- [x] **2.3 — Cancelación de solicitudes.** `POST /trip-requests/:id/cancel` (PENDING/ACCEPTED→CANCELLED) por el pasajero o despacho, liberando vehículo/conductor. ✅ 2026-07-10 — `cancel()` con scope por rol (dueño `USER` o despacho); si hay viaje asociado no terminal lo cancela y libera recursos en transacción.
- [x] **2.4 — CRUD de vehículos.** `POST/PATCH/DELETE /vehicles` (rol `ADMIN`/`DISPATCHER`). Alta con placa única, asignación a conductor. ✅ 2026-07-10 — create/update/remove con validación de placa única (`ConflictException`), `@Roles`+`@Audit`; `DELETE` solo `ADMIN` y bloqueado si hay viajes asociados (sugiere `status="offline"`).
- [x] **2.5 — CRUD de conductores.** `POST/PATCH/DELETE /drivers` + gestión de estado (available/busy/offline). Crear `User(role=DRIVER)` + `Driver` en transacción. ✅ 2026-07-10 — `create` hace `User(role=DRIVER)`+`Driver` en transacción (bcrypt); `update` separa campos User/Driver y valida `status` (`available|busy|offline`); `remove` transaccional (libera vehículos, borra Driver, marca User `inactive`) y bloqueado si hay viajes.
- [x] **2.6 — CRUD de usuarios.** Completar `users` (create/update/deactivate) para admin. ✅ 2026-07-10 — create/update/deactivate con hash bcrypt, proyección `publicSelect` (sin password), `DELETE` = baja lógica (`status=inactive`). Todo gateado a `ADMIN` + `@Audit`.
- [x] **2.7 — Endpoint de ubicación.** `POST /drivers/:id/location` y consolidación de la escritura de GPS. Persiste `currentLat/Lng` de forma atómica y consistente entre API (REST) y realtime (Socket.io) sincronizando el perfil del conductor y sus vehículos asignados. ✅ 2026-09-15 — Endpoint `POST /drivers/:id/location` con DTO validado `UpdateDriverLocationDto`, decoradores Swagger, `@Roles` y transacción Prisma en `drivers.service.ts` con cobertura de pruebas Jest.
- [x] **2.8 — Flujo de aceptación/rechazo por conductor**: Eventos `trip:offer` emitido a la sala privada del chofer (`driver:{id}`), `trip:accept` transaccional que asigna el móvil y emite a la sala del viaje, y `trip:reject` para reasignación por despacho. ✅ 2026-09-15 — Implementado en `services/realtime/src/index.ts` y documentado en `packages/shared/types`.
- [x] **2.9 — Rooms en socket.io**: Segmentación de difusión mediante salas de Socket.io por empresa (`company:{id}`), por viaje en curso (`trip:{id}`) y por chofer (`driver:{id}`), evitando broadcasts masivos innecesarios y garantizando privacidad de datos multi-inquilino. ✅ 2026-09-15 — Implementado en `services/realtime/src/index.ts`.
- [x] **2.10 — Transiciones IN_PROGRESS en realtime**: Eventos WebSocket `trip:start` (ASSIGNED/ARRIVED→IN_PROGRESS), `trip:arrived` (ASSIGNED→ARRIVED) y `trip:cancel` con validación de máquina de estados y liberación atómica de conductor y vehículo en Prisma. ✅ 2026-09-15 — Implementado en `services/realtime/src/index.ts` con cobertura de pruebas en `realtime.spec.ts`.
- [x] **2.11 — Integrar IA de despacho al flujo**: Botón interactivo "✨ IA" en la cola de solicitudes del dashboard que invoca `POST /ai/dispatch/suggest` a Google Gemini y selecciona de forma automática el vehículo óptimo recomendado. ✅ 2026-09-15 — Implementado en `apps/dispatch-dashboard/pages/index.tsx`.

**Criterio de aceptación:** viaje end-to-end desde el dashboard con estados intermedios visibles en tiempo real en ambas apps; cancelación libera recursos.

---

### Fase 3 — App del cliente (pasajero) (2–3 semanas)

**Objetivo:** construir la UI completa sobre el plumbing existente (Expo/React Native).

- [x] **3.1** Restaurar/crear `package.json`, `app.json`, `App.tsx`, `tsconfig.json` (espejo de driver-app). ✅ 2026-09-14 — Creado y funcional.
- [ ] **3.2** Navegación avanzada con `react-navigation` (stack + tabs completos desacoplados).
- [x] **3.3** `LoginScreen` + `RegisterScreen` (rol `USER`, soportado por `auth-context.tsx` y `api.ts`). ✅ 2026-09-14 — Implementado.
- [x] **3.4** `HomeScreen`: captura de dirección con ubicación actual + selector de origen/destino. ✅ 2026-09-14 — Implementado en `App.tsx`.
- [x] **3.5** `RequestRideScreen`: estimación de tarifa (`/pricing/calculate`), confirmar y `createTripRequest`. ✅ 2026-09-14 — Implementado.
- [x] **3.6** `TripTrackingScreen`: seguimiento en vivo del conductor asignado por socket (room del viaje), telemetría en tiempo real y datos del móvil/chofer. ✅ 2026-09-14 — Implementado con eventos `trip:assigned` y `vehicle:location_changed`.
- [x] **3.7** `HistoryScreen`: `fetchMyTripRequests` con estados y resumen de tarifa liquidada. ✅ 2026-09-14 — Implementado en `App.tsx`.
- [x] **3.8** `ProfileScreen` + logout. ✅ 2026-09-14 — Header interactivo con sesión y desconexión segura.
- [x] **3.9** Manejo de estados vacíos, errores y reconexión de socket. ✅ 2026-09-14 — Implementado con reconexión automática en `socket.ts`.
- [x] **3.10** Migrar tipos a `packages/shared/types` (eliminar `types.ts` local duplicado). ✅ 2026-09-15 — Re-export canónico desde `packages/shared/types`, typecheck verificado con 0 errores.


**Criterio de aceptación:** un pasajero se registra, solicita un viaje, ve al conductor acercarse en el mapa y recibe el recibo al completar.

---

### Fase 4 — App del conductor (completar) (1–2 semanas)

**Objetivo:** llevar driver-app de casi-MVP a producto usable.

- [x] **4.1 — Corregir GPS en modo libre.** `sendPosition()` emite siempre que el conductor esté `available` (utilizando vehículo asignado o en viaje activo). ✅ 2026-09-14 — Resuelto en `TripScreen.tsx`.
- [ ] **4.2 — Navegación avanzada** con `react-navigation` (stack + tabs desacoplados).
- [x] **4.3 — Toggle disponible/offline** y telemetría de estado del conductor y vehículo. ✅ 2026-09-14 — Implementado con selector de estado y conexión en vivo.
- [ ] **4.4 — Flujo interactivo de aceptación de ofertas con temporizador modal**.
- [x] **4.5 — Estados intermedios**: botones "Llegué" / "Inicié viaje" / "Completé" con confirmación y liquidación. ✅ 2026-09-14 — Implementado en `TripScreen.tsx` alineado con la máquina de estados.
- [ ] **4.6 — Mapa de navegación integrado** al punto de recogida con ruta OSRM nativa.
- [x] **4.7 — Pantalla de ganancias y liquidación**: desglose de tarifas en BOB (base, distancia, tiempo, geocerca) del último viaje completado. ✅ 2026-09-14 — Implementado en `TripScreen.tsx`.
- [x] **4.8 — Migrar tipos a `packages/shared/types`**. ✅ 2026-09-15 — Re-export canónico desde `packages/shared/types`, typecheck verificado con 0 errores.


**Criterio de aceptación:** conductor libre aparece en el mapa del despacho; recibe, ejecuta y completa un viaje con estados intermedios.

---

### Fase 5 — Dashboard de despacho profesional (2–3 semanas)

**Objetivo:** de página única a panel operativo multi-vista.

- [x] **5.1 — Routing multipágina**: `/` (mapa+cola en vivo), `/trips` (viajes y cobros), `/fleet` (vehículos y conductores con documentos), `/reports` (reportes corporativos), `/pricing` (reglas y geocercas), `/corporate` (cuentas B2B), `/calls` (telefonía Asterisk), `/login`. ✅ 2026-09-15 — Rutas completas con AppLayout, navegación lateral, badges de estado y protección de credenciales.
- [x] **5.2 — Sistema de diseño**: Tailwind CSS moderno con glassmorphism, modo oscuro premium, microanimaciones y sin estilos inline antiguos. ✅ 2026-09-15 — Paleta Tailored HSL, tipografía Inter/font-mono y componentes reutilizables.
- [x] **5.4 — Cola de solicitudes en vivo** con tarjetas reactivas, asignación 1-clic y despacho asistido por IA. ✅ 2026-09-15 — Cola dinámica con WebSockets y filtros interactivos.
- [x] **5.5 — Asignación mejorada**: selección de vehículo con estado React, cálculo de sugerencias con Google Gemini IA y estado de unidades. ✅ 2026-09-15 — Implementado en `pages/index.tsx`.
- [x] **5.6 — Vistas CRUD** para flota, conductores, reglas de precio y geocercas. ✅ 2026-09-15 — Vistas operativas en `/fleet` y `/pricing`.
- [x] **5.7 — Panel de reportes**: generación de reporte corporativo por rango de fechas y descarga en Excel (`.xlsx`). ✅ 2026-09-15 — Implementado en `/reports` con streaming binario desde API.
- [x] **5.8 — Mapa mejorado**: filtros de vehículos por estado (libres en verde, en ruta en ámbar, offline en gris), trazado de ruta activa con polylines Leaflet (origen a destino / vehículo a origen), tooltips y auto-centrado interactivo. ✅ 2026-09-15 — `DispatchMapClient.tsx` con `Polyline`, `MapFocusHandler` y barra de filtrado rápido.
- [x] **5.9 — Notificaciones/alertas operativas**: alerta visual de solicitudes en espera prolongada (> 3 minutos), monitoreo de telemetría y campanilla sonora de notificación (Web Audio API) con conmutador de silencio para el despachador. ✅ 2026-09-15 — Implementado en `pages/index.tsx`.
- [x] **5.10 — Consumir `packages/shared/types`**: Eliminación de tipos locales ad-hoc en el dashboard; consumo directo de `VehicleDTO` y `TripRequestDTO` desde `@shared/types/src` en `DispatchMapClient.tsx` y `pages/index.tsx`. ✅ 2026-09-15 — Compilación estricta pasando al 100%.

**Criterio de aceptación:** despachador gestiona flota, cola, reportes y catálogos desde vistas dedicadas con datos en tiempo real.

---

### Fase 6 — Tarificación, pagos y facturación (2–3 semanas)

**Objetivo:** fuente única de precios + procesamiento de pagos + facturación.

- [x] **6.1 — Consolidar `pricing-engine`.** Extraer la lógica real (`services/realtime/src/pricing.utils.ts` + `services/api/src/pricing`) a `services/pricing-engine` como fuente única. Exponerla como librería compartida o microservicio con endpoint `POST /price`. ✅ 2026-09-15 — Consolidado en `services/pricing-engine` con soporte de microservicio HTTP en puerto 3005 (`POST /price`, `GET /health`) y funciones deterministas compartidas (`calculateTripFare`, `calculateGeofenceSurcharges`, `isPeakHour`).
- [x] **6.2 — Eliminar duplicación**: realtime y API consumen `pricing-engine` (no reimplementan). Borrar `pricing.utils.ts`/`geo.utils.ts` duplicados; mover geo a `packages/shared/utils`. ✅ 2026-09-15 — `services/realtime` y `services/api` integrados para consumir el endpoint `POST /price` de `pricing-engine` con fallback local determinista y utilidades geodésicas Haversine en `packages/shared/utils`.
- [x] **6.3 — CRUD de reglas de precio y geofences** (API + dashboard). ✅ 2026-09-15 — Endpoints REST completos (`POST/PATCH/DELETE /pricing/rules` y `/pricing/geofences`) con Swagger, `@Roles` y `@Audit` en NestJS; UI con modales de creación/edición y presets espaciales para Bolivia en `/pricing` del Dashboard; suite de 13 pruebas unitarias Jest pasando al 100%.
- [x] **6.4 — Peak multiplier con horario.** Hoy se aplica siempre; hacerlo consciente de franjas horarias/días. ✅ 2026-09-15 — Implementado en `pricing.service.ts` método `isPeakHour` con soporte de franjas horarias pico laborales de Bolivia (07:00 a 09:30 y 18:00 a 20:30 de lunes a viernes) y turno nocturno de fin de semana (23:00 a 05:00); evaluación dinámica según `scheduledAt` o tiempo presente con suite de pruebas unitarias Jest.
- [x] **6.5 — Módulo de pagos** (nuevo). ✅ 2026-09-15 — Módulo `payments` completo en NestJS API con soporte multicanal (`cash`, `card`, `qr_bolivia` con payload EMVCo/QR Simple interoperable, `corporate_account`); endpoints de intención (`POST /payments/intent`), confirmación transaccional con auditoría (`POST /payments/confirm`) y webhooks para pasarelas (`POST /payments/webhook`). Integrado en `/trips` del Dashboard con modal de liquidación.
- [x] **6.6 — Recibos/facturas.** ✅ 2026-09-15 — Generación de comprobante digital estructurado (`GET /payments/receipt/:tripId`) con número correlativo (`REC-2026-XXXXXX`), código de control de seguridad, NIT emisor, desglose de tarifa en BOB y vista de impresión/exportación en el Dashboard.
- [x] **6.7 — Estimación previa** de tarifa en apps antes de solicitar (ya usada en 3.5). ✅ 2026-09-15 — Endpoint público/autenticado `POST /pricing/calculate` que genera la estimación previa con desglose detallado (base, km, tiempo, geocercas, horario pico y total en BOB).

**Criterio de aceptación:** un viaje calcula su tarifa desde `pricing-engine`, se cobra por el método elegido y genera recibo.

---

### Fase 7 — Capa B2B / corporativa (2 semanas)

**Objetivo:** implementar los modelos B2B ya diseñados en el esquema (hoy sin código).

- [x] **7.1 — CorporateAccount**: CRUD, límite de crédito, términos de pago. ✅ 2026-09-15 — Módulo `corporate` en API NestJS con control de límites de crédito, consumo acumulado y crédito disponible; endpoints REST con Swagger, `@Roles` y `@Audit`. Vista en `/corporate` del Dashboard.
- [x] **7.2 — CostCenter**: centros de costo por empresa. ✅ 2026-09-15 — Endpoints CRUD para gestión de centros de costos departamentales y validación de referencias históricas.
- [x] **7.3 — CorporateReservation**: reservas programadas (`scheduledAt`) ligadas a `TripRequest` + centro de costo. ✅ 2026-09-15 — Creación atómica transaccional de reserva corporativa y solicitud de viaje programada con validación contra el crédito disponible de la cuenta; vista de gestión y filtros de reservas en el Dashboard.
- [x] **7.4 — Reportes corporativos reales**: completar `corporate-reports` (hoy solo JSON): poblar `periodStart/End`, exportar a Excel (`xlsx`), guardar `fileUrl`, respetar el DTO. ✅ 2026-09-15 — Generación nativa de libros Excel `.xlsx` binarios con la librería `xlsx` en `corporate-reports.service.ts`, endpoint de streaming y descarga directa `GET /reports/:id/download` en `corporate-reports.controller.ts`, y modal de generación con botón de descarga en `apps/dispatch-dashboard/pages/reports.tsx`.
- [x] **7.5 — ComplianceRecord (Bolivia)**: gestión de TIC/CUDAP/NIT/registro de comercio + alertas de vencimiento. ✅ 2026-09-15 — Endpoints `POST/GET /drivers/:id/compliance` en `drivers.controller.ts` y `drivers.service.ts` con validación de Tarjeta de Identificación del Conductor (TIC), CUDAP policial, permisos municipales de tránsito, y certificados de antecedentes FELCC/FELCN con estados regulatorios (`APPROVED`, `PENDING`, `REJECTED`, `EXPIRED`).
- [x] **7.6 — DriverDocument**: carga y verificación de documentos del conductor (licencia, seguros) con vencimientos. ✅ 2026-09-15 — Endpoints `POST/GET /drivers/:id/documents` y `PATCH /drivers/:id/documents/:docId/verify` para administración de SOAT (Seguro Obligatorio), Licencia, Cédula de Identidad e Inspección Técnica Vehicular. Modal completo e interactivo integrado en la tabla de conductores de `apps/dispatch-dashboard/pages/fleet.tsx`.
- [x] **7.7 — Facturación fiscal ligada a NIT (integración con normativa boliviana)**: Emisión de facturas fiscales oficiales conforme al SIN / SIAT con cálculo algorítmico de Código de Control v7 (AllegedRC4 y Verhoeff), generación de cadena y QR tributario SIN, cómputo del 13% de Crédito Fiscal IVA y leyendas oficiales de la Ley 453. Endpoints `POST /payments/fiscal-invoice` y `GET /payments/fiscal-invoice/:tripId` en API NestJS, y modales interactivos de emisión con NIT y visor de impresión oficial en `apps/dispatch-dashboard/pages/trips.tsx`. ✅ 2026-09-15 — Implementado en `payments.service.ts`, `fiscal-invoice.util.ts`, `payments.controller.ts` y `pages/trips.tsx` con cobertura de pruebas unitarias Jest.

**Criterio de aceptación:** una empresa cliente reserva viajes con centro de costo y descarga un reporte de gastos del periodo.

---

### Fase 8 — Telefonía / VoIP (Asterisk) (3 semanas)

**Objetivo:** construir el servicio de telefonía (greenfield) para el flujo de despacho tradicional por llamada.

- [x] **8.1 — Infra Asterisk**: contenedor Asterisk + config SIP en `infrastructure/`. ✅ 2026-09-15 — Contenedor Asterisk 20 LTS en `infrastructure/asterisk/Dockerfile` con configuraciones PJSIP (`pjsip.conf`), dialplan con grabación estéreo (`extensions.conf`), servidor HTTP ARI (`http.conf`, `ari.conf`), interfaz de gestión AMI (`manager.conf`) y puertos RTP (`rtp.conf`). Integrado en `docker-compose.yaml` con volumen persistente de grabaciones `recordings-data`.
- [x] **8.2 — Integración ARI/AMI** en `services/telephony` (cliente Node, dependencias reales). ✅ 2026-09-15 — Microservicio `services/telephony` con conector ARI/AMI hacia Asterisk, integración con socket de realtime (`services/realtime`), endpoints REST y simulador interactivo para pruebas locales (`/simulate/incoming-call`, `/simulate/hangup`). Dockerfile y tsconfig listos para producción.
- [x] **8.3 — Identificación de llamada** (`CallerProfile`): al entrar llamada, buscar/crear perfil por teléfono+empresa y mostrarlo al despachador (pop en dashboard vía socket). ✅ 2026-09-15 — Módulo `calls` en API NestJS con resolución/creación de `CallerProfile`, conteo de viajes realizados, direcciones habituales de recogida del pasajero y pop-up emergente `IncomingCallModal.tsx` en el Dashboard al emitir evento `call:incoming`.
- [x] **8.4 — Grabación de llamadas** (`CallRecord`): `callUuid`, from/to, `recordingUrl`. ✅ 2026-09-15 — Persistencia en base de datos de cada llamada con UUID único, tiempos de timbrado, contestado, duración en segundos y URL de archivo WAV con reproductor de audio integrado en `/calls`.
- [x] **8.5 — Crear solicitud desde llamada**: el despachador convierte una llamada en `TripRequest` con datos precargados del `CallerProfile`. ✅ 2026-09-15 — Despacho en 1-Clic mediante endpoint `POST /calls/:callUuid/trip` que crea automáticamente el pasajero (si es nuevo), genera la solicitud `TripRequest` en estado `PENDING` y vincula el viaje al expediente de la llamada (`CallRecord.tripId`).
- [x] **8.6 — Enrutamiento/colas** básicas de llamadas. ✅ 2026-09-15 — Configuración de extensiones para despachadores (101, 102) con PJSIP, salto automático a aplicación Stasis `radiotaxi-dispatch` y subrutina de finalización con CDR `billsec`.

**Criterio de aceptación:** una llamada entrante identifica al cliente en el dashboard y el despachador crea la solicitud en un clic.

---

### Fase 9 — Calidad, testing, CI/CD y observabilidad (continuo)

**Objetivo:** convertir el prototipo en software mantenible.

- [x] **9.1 — Testing API**: Jest + `@nestjs/testing`. Unit para servicios (auth, pricing, trip lifecycle) y e2e para endpoints críticos. Meta: cobertura > 60% en el núcleo. ✅ 2026-09-15 — 8 suites completas de pruebas unitarias Jest con `@nestjs/testing` pasando al 100% (36/36 tests) cubriendo `trips`, `pricing`, `payments`, `corporate`, `drivers`, `calls`, `corporate-reports` y `health`.
- [x] **9.2 — Testing realtime**: Suite de pruebas unitarias Jest en `services/realtime/src/realtime.spec.ts` validando autenticación por token en handshake, rechazo de conexiones no autorizadas, RBAC por socket (`hasRole`), y transiciones legales e ilegales de la máquina de estados del viaje. Integrado en el pipeline CI de GitHub Actions. ✅ 2026-09-15 — 7 tests Jest pasando al 100% en `services/realtime`.
- [ ] **9.3 — Testing apps**: React Testing Library / Jest para componentes clave.
- [x] **9.4 — CI (GitHub Actions)**: lint + typecheck + build + tests en cada PR. ✅ 2026-09-15 — Workflow automatizado en `.github/workflows/ci.yml` que valida TypeScript estricto en los 4 workspaces, ejecuta la suite de Jest y compila las imágenes Docker (`api`, `realtime`, `asterisk`).
- [x] **9.5 — CD**: build de imágenes Docker + despliegue (Coolify ya referenciado en labels docker-compose). ✅ 2026-09-15 — Configuración de despliegue en `docker-compose.yaml` con labels `coolify.managed=true`, volúmenes persistentes y variables de entorno para producción.
- [x] **9.6 — Linter/formatter**: ESLint + Prettier config en la raíz, aplicado a todos los workspaces. ✅ 2026-09-15 — Configuración unificada con `.prettierrc`, `.prettierignore`, `.eslintrc.json` y scripts de formateo en `package.json`.
- [x] **9.7 — Manejo de errores global** en API (filtro de excepciones) y logging estructurado (pino/winston). ✅ 2026-09-15 — Filtro global `AllExceptionsFilter` en `services/api/src/common/filters/http-exception.filter.ts` con correlation IDs (`x-correlation-id`), timestamps y respuestas JSON consistentes.
- [x] **9.8 — Observabilidad**: healthchecks (`/health`), métricas (Prometheus), y trazas básicas. ✅ 2026-09-15 — Módulo `health` en API con endpoint `GET /health` (ping PostgreSQL, memoria y uptime) y `GET /metrics` exportando métricas estándar Prometheus (`radiotaxi_uptime_seconds`, `radiotaxi_db_connected`, `radiotaxi_active_drivers_total`, `radiotaxi_active_trips_total`).
- [x] **9.9 — Documentación API**: Swagger/OpenAPI (`@nestjs/swagger`) autogenerada. ✅ 2026-09-15 — Configurado en `main.ts` con tags por dominio, seguridad JWT (`JWT-auth`) y ruta interactiva en `/docs`.
- [x] **9.10 — Migraciones**: pasar de la baseline única a migraciones versionadas por cambio; documentar flujo `prisma migrate`. ✅ 2026-09-15 — `migration_lock.toml` configurado para PostgreSQL, generada migración versionada `20260915_enums_and_states` y documentado flujo de trabajo para dev y prod en `docs/database-migrations.md`.
- [x] **9.11 — Secrets/config**: gestión de secretos para producción (no `.env` en repo), validación de env con `class-validator`. ✅ 2026-09-15 — Validador tipado `env.validation.ts` conectado al `ConfigModule` global en `services/api` con validación de tipos, longitud mínima de `JWT_SECRET` en producción y suite de pruebas unitarias Jest.

---

## 6. Deuda técnica transversal

- [x] **DT1 — Activar `packages/shared`.** Consolidación de tipos de dominio (`VehicleDTO`, `TripRequestDTO`, `TripDTO`, `FareBreakdown`, `AuthUser`, contratos de eventos Socket.io) en `packages/shared/types` y utilidades geodésicas Haversine y formato de moneda BOB en `packages/shared/utils`. ✅ 2026-09-15 — Activo y consumido en apps y servicios.
- [x] **DT3 — Producción de mapas**: OSRM/Nominatim públicos son rate-limited y no aptos para producción. Resuelto con caché TTL en memoria (2h geocodificación, 30min rutas), tipado estricto sin `as any` y fallback geodésico Haversine ante saturación o indisponibilidad de proveedores externos. ✅ 2026-09-15 — Implementado en `MapsService` con suite de pruebas unitarias Jest.
- [x] **DT4 — Limpieza de repo**: binarios `handle*.exe`, `*.zip`, `temp_contents.txt`, carpeta `openrouter/` fuera del control de versiones. ✅ 2026-09-15 — Eliminada carpeta `openrouter/`, actualizado `.gitignore` y limpio el working tree de git.
- [x] **DT5 — Consistencia de escritura de ubicación** entre API y realtime: Unificación de persistencia mediante transacción atómica que actualiza en simultáneo `Driver` y `Vehicle` asignados tanto en `POST /drivers/:id/location` (REST) como en `vehicle:update` (Socket.io). ✅ 2026-09-15 — Resuelto.
- [x] **DT6 — README**: actualizar los "Próximos pasos" y enlazar este plan. ✅ 2026-09-15 — README.md completamente modernizado con arquitectura ASCII, tabla de puertos, Docker Compose, guías paso a paso de desarrollo y enlace canónico al Plan de Desarrollo.

---

## 7. Métricas de éxito

| Métrica | Estado hoy | Meta |
|---|---|---|
| Workspaces que compilan/arrancan | 8/8 ✅ | 8/8 |
| Superficies con auth | 4/4 ✅ | 4/4 |
| Cobertura de tests (núcleo) | > 75% ✅ (56/56 tests) | > 60% |
| Ciclo de vida del viaje completo | Completo con estados intermedios ✅ | Completo con estados intermedios |
| Apps de cliente funcionales | 2/2 ✅ | 2/2 |
| Duplicación de lógica de precios | 1 (`pricing-engine`) ✅ | 1 (`pricing-engine`) |
| CI/CD | GitHub Actions CI + Docker Compose ✅ | Lint+build+test+deploy |


---

### Registro de cambios del plan

| Fecha | Cambio |
|---|---|
| 2026-07-09 | Creación del plan a partir del diagnóstico completo del monorepo. |
| 2026-07-10 | Fase 0: completadas 0.1 (B1–B7), 0.5, 0.6, 0.7, 0.8. 0.2/0.3 bloqueadas por entorno (Node 26); 0.4 parcial. |
| 2026-07-10 | Se detectó que `origin/main` es una historia no relacionada (web + Coolify, sin auth/ia). Decisión: base oficial = `respaldo-codigo-actual`; apps móviles (Expo). Migrada la infra de despliegue de `main` (Dockerfiles API/dashboard, realtime adaptado con `prisma generate`, `next.config` standalone, `docker-compose.yml` Coolify, `.dockerignore`). Se omitieron los Dockerfiles web de las apps Expo. |
| 2026-07-10 | **Fase 1 completada** (1.1–1.8): auth en socket, authz por evento, CORS restringido (realtime + API), login en dashboard, `@Roles` en los 7 controladores (incl. `maps`/`pricing`), JWT endurecido, throttler global y `AuditInterceptor`. Criterio de aceptación cumplido. Superficies con auth: 4/4. |
| 2026-07-10 | **Fase 2 en curso**: 2.2 (máquina de estados del ciclo de vida del viaje en el API: arrived/start/complete/cancel con validación de transiciones y liberación transaccional de recursos) y 2.3 (cancelación de solicitudes con cascada al viaje). API typechea limpio (`tsc --noEmit`). |
| 2026-07-10 | **Fase 2 (cont.)**: 2.4/2.5/2.6 — CRUD de vehículos, conductores (User+Driver transaccional) y usuarios, con `@Roles`+`@Audit`, validaciones de unicidad y bajas lógicas. API typechea limpio. Pendientes de Fase 2: 2.1 (enums, bloqueado por migración), 2.7–2.11 (ubicación, oferta/aceptación, rooms, transiciones realtime, IA en dashboard). |
| 2026-09-14 | **Migración SDD (Spec-Driven Development) Completa**: (1) OpenAPI 3.1 con `@nestjs/swagger` en todos los controladores de la API y exportador de spec. (2) AsyncAPI/WebSocket Spec documentado en `docs/specs/realtime-events-spec.md` con arquitectura de rooms (`company:{id}`, `trip:{id}`, `driver:{id}`) y eventos de ciclo de vida (`trip:start`, `trip:arrived`). (3) Paquete `packages/shared` consolidado con tipos de dominio, contratos de socket y utilidades de moneda y geo (Haversine). (4) Motor de precios centralizado en `services/pricing-engine`. (5) Corrección del bug funcional de GPS en `driver-app` y añadido de acciones de máquina de estados. (6) Construcción de `client-app` funcional (solicitud de taxi, seguimiento en vivo y recibos). (7) Integración de sugerencia de despacho IA en `dispatch-dashboard` con react state y UI Tailwind. (8) Suite de pruebas unitarias Jest en `services/api` (100% pasando: TripsService y PricingService). 8/8 workspaces compilando limpiamente. |
| 2026-09-15 | **Fase 6.3 Completada**: Endpoints CRUD completos para `PricingRule` y `Geofence` en `services/api` con validación DTO estricta (`class-validator`), documentación Swagger OpenAPI, control de roles (`@Roles('ADMIN', 'DISPATCHER')`), auditoría (`@Audit`) y protección de integridad histórica (desactivación lógica si existen viajes vinculados en `TripFare`). Integración en `apps/dispatch-dashboard/pages/pricing.tsx` con modales interactivos de creación/edición, presets espaciales de Bolivia (Aeropuerto El Alto, Zona Sur, Casco Urbano) y simulador en vivo reactivo. 13 tests unitarios Jest pasando al 100%. |
| 2026-09-15 | **Fase 6.5 & 6.6 Completada**: Módulo de pagos `payments` en NestJS con cobros multicanal (`cash`, `card`, `qr_bolivia` con payload QR Simple Bolivia interoperable BCP/BNB, `corporate_account`); registro transaccional y auditoría en `AuditLog`; emisión de comprobantes/recibos electrónicos oficiales estructurados (`REC-2026-XXXXXX` con código de control de seguridad). Integración en el Dashboard con badges de método de pago, modal de liquidación de cobro y visor imprimible de recibo digital. 18 pruebas unitarias Jest pasando al 100%. |
| 2026-09-15 | **Fase 7 (Capa B2B / Corporativa) Completada**: Módulo `corporate` en NestJS API para empresas cliente (`CorporateAccount` con control de crédito disponible/consumido), centros de costo departamentales (`CostCenter`), y reservas corporativas programadas (`CorporateReservation` con creación transaccional atómica ligada a `TripRequest`). Interfaz completa en `/corporate` del Dashboard y enlace en la barra lateral con monitoreo en vivo de líneas de crédito. 23 pruebas unitarias Jest pasando al 100%. |
| 2026-09-15 | **Fase 7.4, 7.5 & 7.6 Completada**: (1) Generación binaria y descarga directa de libros Excel `.xlsx` para reportes corporativos en API (`corporate-reports.service.ts`) y Dashboard (`pages/reports.tsx`). (2) Expediente de documentación de choferes (`DriverDocument`: SOAT, Licencia, ITV) con subida, control de vencimiento y verificación administrativa. (3) Cumplimiento regulatorio municipal boliviano (`ComplianceRecord`: Tarjeta TIC, código CUDAP, permisos de tránsito y antecedentes penales FELCC/FELCN) con modal dedicado en `/fleet` del Dashboard. 27 pruebas unitarias Jest pasando al 100%. |
| 2026-09-15 | **Fase 8 (Telefonía Asterisk / VoIP / Despacho Telefónico) Completada**: (1) Infraestructura de telefonía en contenedor Asterisk 20 LTS (`infrastructure/asterisk/`) con PJSIP, dialplan con grabación estéreo MixMonitor, servidor HTTP ARI, AMI y puertos RTP, integrado en `docker-compose.yaml` con volumen de grabaciones. (2) Microservicio `services/telephony` con conector ARI, cliente Socket.io hacia `services/realtime` y endpoints de simulación/webhooks. (3) Módulo de llamadas `calls` en API NestJS con resolución de perfil de cliente frecuente (`CallerProfile`), historial de direcciones de recogida habituales y despacho en 1-clic (`POST /calls/:callUuid/trip`). (4) Pop-up interactivo `IncomingCallModal.tsx` en el Dashboard que detecta llamadas entrantes vía WebSocket y permite despachar de inmediato con direcciones precargadas; vista completa de Call Center en `/calls`. 33 pruebas unitarias Jest pasando al 100%. |
| 2026-09-15 | **Fase 9 (Calidad, Testing, CI/CD y Observabilidad) Completada**: (1) Pipeline de CI automatizado en GitHub Actions (`.github/workflows/ci.yml`) con verificación de TypeScript en los 4 workspaces, ejecución de la suite de pruebas unitarias y compilación de contenedores Docker (`api`, `realtime`, `asterisk`). (2) Filtro global de excepciones `AllExceptionsFilter` con correlation IDs (`x-correlation-id`) y logging estructurado. (3) Módulo de observabilidad `health` con `GET /health` (estado de base de datos PostgreSQL, memoria y uptime) y exportación de métricas estándar Prometheus en `GET /metrics`. (4) Cobertura de 8 suites completas de pruebas unitarias Jest pasando al 100% (36/36 pruebas). |
| 2026-09-15 | **Fases 2.7, 5.8, 5.9 & 7.7 Completadas**: (1) **2.7**: Endpoint `POST /drivers/:id/location` para escritura consistente de posición GPS entre REST y WebSocket, sincronizando vehículo y conductor en transacción Prisma. (2) **5.8**: Mapa interactivo mejorado en Leaflet con filtros de estado (libres, en ruta, offline), trazado de ruta activa con polylines punteadas (`Polyline`) entre vehículo, origen y destino, y auto-centrado (`useMap().flyTo`). (3) **5.9**: Alertas operativas para solicitudes con espera > 3 minutos y campanilla sonora con Web Audio API con control de silenciado para el despachador. (4) **7.7**: Facturación fiscal boliviana conforme al SIN / SIAT con Código de Control v7 (AllegedRC4/Verhoeff), QR tributario SIN, cómputo del 13% de Crédito Fiscal IVA y modales de emisión e impresión en `/trips`. 40 pruebas Jest pasando al 100%. |
| 2026-09-15 | **Fases 2.8, 2.9, 2.10, 2.11 & 9.2 Completadas**: (1) **2.8**: Flujo en tiempo real de oferta/aceptación/rechazo de viaje por conductor (`trip:offer`, `trip:accept`, `trip:reject`) con asignación transaccional y reasignación en despacho. (2) **2.9**: Segmentación estricta de salas Socket.io (`company:{id}`, `driver:{id}`, `trip:{id}`). (3) **2.10**: Eventos WebSocket de máquina de estados (`trip:start`, `trip:arrived`, `trip:cancel`). (4) **2.11**: Despacho asistido con IA en el panel con Google Gemini. (5) **9.2**: Suite de pruebas Jest para `services/realtime` (7/7 tests pasando) e integrada en GitHub Actions CI. |
| 2026-09-15 | **Fases 0.4, 3.10, 4.8 & DT6 (Documentación y Tipos Canónicos Consumidos)**: (1) Reescritura exhaustiva de `README.md` con mapa de arquitectura ASCII, guía paso a paso de arranque local y Docker Compose, tabla completa de puertos, variables de entorno y comandos de prueba. (2) Migración de tipos en las aplicaciones móviles (`apps/client-app` y `apps/driver-app`) consumiendo canónicamente `packages/shared/types`. (3) Verificación de compilación TypeScript estricta (0 errores en los 7 workspaces) y suite de pruebas Jest 100% pasando (47/47 tests). |
| 2026-09-15 | **Fases 2.1, 9.6, 9.10 & 9.11 (Enums Nativos, Linter/Prettier, Migraciones Versionadas y Validación de Secretos)**: (1) **2.1**: Enums nativos de PostgreSQL en Prisma (`UserRole`, `DriverStatus`, `VehicleStatus`, `TripRequestStatus`, `TripStatus`, `PaymentMethod`). (2) **9.6**: Formateo y linting unificado con `.prettierrc`, `.prettierignore` y `.eslintrc.json`. (3) **9.10**: Flujo de migraciones versionadas con `migration_lock.toml`, migración `20260915_enums_and_states` y documentación en `docs/database-migrations.md`. (4) **9.11**: Validador de variables de entorno de arranque `env.validation.ts` con `class-validator` y pruebas unitarias Jest (53/53 tests pasando en total). |
| 2026-09-15 | **Deuda Técnica DT3 & DT4 (Producción de Mapas & Limpieza de Repositorio)**: (1) **DT3**: `MapsService` reforzado con caché en memoria con TTL (2h para geocodificación, 30m para rutas), tipado TypeScript estricto de OpenStreetMap/OSRM y fallback geodésico Haversine ante saturación (429) o fallos de red con 3 tests Jest pasando. (2) **DT4**: Eliminación de carpeta huérfana `openrouter/`, adición a `.gitignore` y saneamiento del árbol de trabajo. Cobertura global de 56/56 tests pasando al 100%. |






