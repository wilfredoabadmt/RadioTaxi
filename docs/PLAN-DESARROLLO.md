# Plan de Desarrollo — RadioTaxi SaaS Platform

> Documento vivo de planificación y seguimiento del desarrollo.
> **Última actualización:** 2026-07-09
> **Rama de trabajo:** `respaldo-codigo-actual` → objetivo integrar a `main`
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
- [ ] **0.2** Verificar `npm install --legacy-peer-deps` limpio desde raíz. ⛔ **Bloqueado por entorno** (Node 26 + npm que extrae incompleto). Requiere Node LTS 20/22.
- [ ] **0.3** Verificar que cada workspace compila: `npm run build --workspaces`. ⛔ **Bloqueado** (mismo motivo que 0.2 + `prisma generate` incompatible con Node 26).
- [ ] **0.4** Levantar stack local completo: Postgres (docker-compose), `api` (3000), `realtime` (3002), `dashboard` (3001). Documentar en README el arranque real. 🟡 docker-compose ya expone puertos (ver 0.5); falta validar el arranque real (depende de 0.2/0.3 o de `docker-compose up`).
- [x] **0.5** Alinear `docker-compose.yaml`: hace referencia a `apps/dispatch-dashboard-temp/Dockerfile` (ruta inexistente) → corregir a `apps/dispatch-dashboard`. ✅ 2026-07-10 — corregida la ruta; añadidos `ports` a `api` (3000:3000) y `dashboard` (3001:3000) + `depends_on` y defaults de `NEXT_PUBLIC_*`.
- [x] **0.6** Crear un **script de seed** Prisma (`prisma/seed.ts`): 1 empresa, 1 admin, 1 dispatcher, 2 conductores+vehículos, 1 pasajero, reglas de precio y geofences de ejemplo. Añadir `prisma db seed`. ✅ 2026-07-10 — `services/api/prisma/seed.ts` idempotente (upsert) con contexto Bolivia/La Paz (BOB); añadido `prisma.seed` + script `prisma:seed` + devDep `ts-node` en `services/api/package.json`. ⚠️ Ejecución pendiente de validar (bloqueador 0.2/0.3).
- [x] **0.7** `.gitignore`: sacar del repo binarios `handle*.exe`, `handle.zip`, `skills.zip`, `temp_contents.txt` (ruido). ✅ 2026-07-10 — reglas añadidas (`*.exe`, `*.zip`, `temp_contents.txt`, `desktop.ini`) y `git rm --cached` de los 7 archivos.
- [x] **0.8** Añadir `.env.example` faltantes a `realtime`, `dashboard`, `client-app`, `driver-app` con todas las variables. ✅ 2026-07-10 — creado `apps/client-app/.env.example` (el único que faltaba; los otros 3 ya existían).

**Criterio de aceptación:** `docker-compose up` + seed → dashboard muestra datos reales y el mapa pinta vehículos.

---

### Fase 1 — Seguridad y consistencia de auth (1–2 semanas)

**Objetivo:** misma identidad JWT en REST y socket; roles aplicados en todas las superficies.

- [ ] **1.1 — Auth en el socket de realtime.** Middleware `io.use()` que valide el JWT (mismo `JWT_SECRET` que la API) en el handshake. Rechazar conexiones sin token válido. Adjuntar `socket.data.user`.
- [ ] **1.2 — Autorización por evento en realtime.** `trip:assign`/`trip:complete` solo `ADMIN`/`DISPATCHER`; `vehicle:update` solo el `DRIVER` dueño del vehículo. Validar que el driver no mueva vehículos ajenos.
- [ ] **1.3 — CORS restringido.** Reemplazar `cors:{origin:'*'}` por lista blanca desde env (`ALLOWED_ORIGINS`) en realtime **y** API.
- [ ] **1.4 — Login en el dashboard.** Página `/login`, guardar JWT (httpOnly cookie o storage), interceptor que añade `Authorization: Bearer`, guard de ruta que redirige a `/login`. Gatear a roles `ADMIN`/`DISPATCHER`.
- [ ] **1.5 — Cerrar guards del API.** Añadir `@Roles` a `trips`, `vehicles`, `drivers`, `pricing`, `maps`, `trip-fares`, `corporate-reports` según matriz de permisos (definir en `docs/PERMISOS.md`).
- [ ] **1.6 — Endurecer JWT.** Config central del secreto; **fallar en arranque** si `JWT_SECRET` es el default en `NODE_ENV=production`. Evaluar refresh tokens y expiración configurable.
- [ ] **1.7 — Rate limiting** en la API (`@nestjs/throttler`), especialmente en `/auth/*` y `/maps/*`.
- [ ] **1.8 — Auditoría.** Poblar el modelo `AuditLog` (ya existe) con un interceptor Nest para acciones sensibles (login, asignaciones, cambios de estado).

**Criterio de aceptación:** un cliente sin token no puede leer datos ni emitir eventos; un `USER` no puede asignar viajes; el dashboard exige login.

---

### Fase 2 — Núcleo de despacho y ciclo de vida del viaje (2–3 semanas)

**Objetivo:** cerrar el flujo completo solicitar → asignar → en curso → completar → cancelar, con estados intermedios y CRUD de flota.

- [ ] **2.1 — Enums nativos Prisma.** Migrar los `String` de estado (Vehicle/Driver/TripRequest/Trip status, User.role, paymentMethod) a `enum` de Prisma. Migración + regenerar cliente. Elimina errores por strings mágicos.
- [ ] **2.2 — Ciclo de vida del viaje en el API.** Endpoints/transiciones: `POST /trips/:id/start` (ASSIGNED→IN_PROGRESS), `POST /trips/:id/arrived`, `POST /trips/:id/complete`, `POST /trips/:id/cancel` (con motivo). Validar transiciones legales (máquina de estados).
- [ ] **2.3 — Cancelación de solicitudes.** `POST /trip-requests/:id/cancel` (PENDING/ACCEPTED→CANCELLED) por el pasajero o despacho, liberando vehículo/conductor.
- [ ] **2.4 — CRUD de vehículos.** `POST/PATCH/DELETE /vehicles` (rol `ADMIN`/`DISPATCHER`). Alta con placa única, asignación a conductor.
- [ ] **2.5 — CRUD de conductores.** `POST/PATCH/DELETE /drivers` + gestión de estado (available/busy/offline). Crear `User(role=DRIVER)` + `Driver` en transacción.
- [ ] **2.6 — CRUD de usuarios.** Completar `users` (create/update/deactivate) para admin.
- [ ] **2.7 — Endpoint de ubicación.** `POST /drivers/:id/location` y/o consolidar la escritura de GPS (hoy solo realtime escribe `vehicle:update`). Persistir `currentLat/Lng` de forma consistente entre API y realtime.
- [ ] **2.8 — Flujo de aceptación/rechazo por conductor** (opcional según modelo de negocio): evento `trip:offer` → `trip:accept`/`trip:reject` con timeout y reasignación automática.
- [ ] **2.9 — Rooms en socket.io.** Dejar de emitir todo con `io.emit`. Rooms por empresa (`company:{id}`), por viaje (`trip:{id}`) y por rol. El pasajero solo recibe su viaje; el despachador de una empresa solo su flota.
- [ ] **2.10 — Transiciones IN_PROGRESS en realtime.** Añadir eventos `trip:start`/`trip:arrived`/`trip:cancel` que reflejen la máquina de estados del API.
- [ ] **2.11 — Integrar IA de despacho** al flujo: botón "Sugerir vehículo" en dashboard que consuma `POST /ai/dispatch/suggest` y pre-seleccione el vehículo recomendado.

**Criterio de aceptación:** viaje end-to-end desde el dashboard con estados intermedios visibles en tiempo real en ambas apps; cancelación libera recursos.

---

### Fase 3 — App del cliente (pasajero) (2–3 semanas)

**Objetivo:** construir la UI completa sobre el plumbing existente (Expo/React Native).

- [ ] **3.1** Restaurar/crear `package.json`, `app.json`, `App.tsx`, `tsconfig.json` (espejo de driver-app).
- [ ] **3.2** Navegación con `react-navigation` (stack + tabs).
- [ ] **3.3** `LoginScreen` + `RegisterScreen` (rol `USER`, ya soportado por `api.ts`).
- [ ] **3.4** `HomeScreen`: mapa con ubicación actual + selector de origen/destino (geocoding vía `/maps/geocode`).
- [ ] **3.5** `RequestRideScreen`: estimación de tarifa (`/pricing/calculate`), confirmar y `createTripRequest`.
- [ ] **3.6** `TripTrackingScreen`: seguimiento en vivo del conductor asignado por socket (room del viaje), ETA, datos del vehículo/conductor.
- [ ] **3.7** `HistoryScreen`: `fetchMyTripRequests` con estados y recibos.
- [ ] **3.8** `ProfileScreen` + logout.
- [ ] **3.9** Manejo de estados vacíos, errores y reconexión de socket.
- [ ] **3.10** Migrar tipos a `packages/shared/types` (eliminar `types.ts` local).

**Criterio de aceptación:** un pasajero se registra, solicita un viaje, ve al conductor acercarse en el mapa y recibe el recibo al completar.

---

### Fase 4 — App del conductor (completar) (1–2 semanas)

**Objetivo:** llevar driver-app de casi-MVP a producto usable.

- [ ] **4.1 — Corregir GPS en modo libre.** `sendPosition()` debe emitir siempre que el conductor esté `available` (hoy solo emite con viaje activo → conductor libre invisible en el mapa). *Bug funcional clave.*
- [ ] **4.2 — Navegación** con `react-navigation`: Login → Home(disponible/offline) → Trip → History → Profile.
- [ ] **4.3 — Toggle disponible/offline** que actualice estado del conductor y vehículo.
- [ ] **4.4 — Flujo de aceptación** de ofertas (si se adopta 2.8): aceptar/rechazar con temporizador.
- [ ] **4.5 — Estados intermedios**: botones "Llegué" / "Inicié viaje" / "Completé" (alinear con 2.2/2.10).
- [ ] **4.6 — Mapa de navegación** al punto de recogida (deep link a Google/Apple Maps o mapa embebido con ruta OSRM).
- [ ] **4.7 — Pantalla de ganancias** (viajes completados + tarifas del día/semana).
- [ ] **4.8 — Migrar tipos a `packages/shared/types`.**

**Criterio de aceptación:** conductor libre aparece en el mapa del despacho; recibe, ejecuta y completa un viaje con estados intermedios.

---

### Fase 5 — Dashboard de despacho profesional (2–3 semanas)

**Objetivo:** de página única a panel operativo multi-vista.

- [ ] **5.1 — Routing multipágina**: `/dashboard` (mapa+cola), `/trips`, `/vehicles`, `/drivers`, `/reports`, `/pricing`, `/users`, `/login`.
- [ ] **5.2 — Sistema de diseño**: adoptar una librería UI (p.ej. Tailwind + shadcn/ui o MUI). Eliminar estilos inline y el hack `document.getElementById`.
- [ ] **5.3 — Gestión de estado**: React Query para fetching/caché; contexto de auth.
- [ ] **5.4 — Cola de solicitudes en vivo** con filtros (estado, empresa, fecha), búsqueda y paginación (quitar `.slice(0,4)`).
- [ ] **5.5 — Asignación mejorada**: seleccionar vehículo con estado React (no DOM), mostrar sugerencia IA, distancia y ETA.
- [ ] **5.6 — Vistas CRUD** para vehículos, conductores, usuarios, reglas de precio y geofences (consumen endpoints Fase 2/6).
- [ ] **5.7 — Panel de reportes**: generar reporte corporativo por rango de fechas + descarga (Excel vía `xlsx`, ya dependencia).
- [ ] **5.8 — Mapa mejorado**: clustering de vehículos, colores por estado, trazado de ruta activa, auto-follow del viaje seleccionado.
- [ ] **5.9 — Notificaciones/alertas** (viaje sin asignar > N min, conductor sin señal GPS).
- [ ] **5.10 — Consumir `packages/shared/types`.**

**Criterio de aceptación:** despachador gestiona flota, cola, reportes y catálogos desde vistas dedicadas con datos en tiempo real.

---

### Fase 6 — Tarificación, pagos y facturación (2–3 semanas)

**Objetivo:** fuente única de precios + procesamiento de pagos + facturación.

- [ ] **6.1 — Consolidar `pricing-engine`.** Extraer la lógica real (`services/realtime/src/pricing.utils.ts` + `services/api/src/pricing`) a `services/pricing-engine` como fuente única. Exponerla como librería compartida o microservicio con endpoint `POST /price`.
- [ ] **6.2 — Eliminar duplicación**: realtime y API consumen `pricing-engine` (no reimplementan). Borrar `pricing.utils.ts`/`geo.utils.ts` duplicados; mover geo a `packages/shared/utils`.
- [ ] **6.3 — CRUD de reglas de precio y geofences** (API + dashboard). Editor de polígonos en el mapa para geofences.
- [ ] **6.4 — Peak multiplier con horario.** Hoy se aplica siempre; hacerlo consciente de franjas horarias/días.
- [ ] **6.5 — Módulo de pagos** (nuevo). Integración pasarela (evaluar: Stripe internacional, o local Bolivia — QR Simple/BCP/Tigo Money). Métodos: efectivo, tarjeta, cuenta corporativa. Endpoints de intención de pago, confirmación y webhook.
- [ ] **6.6 — Recibos/facturas.** Generar recibo por viaje; base para facturación fiscal Bolivia (NIT, ver Fase 7).
- [ ] **6.7 — Estimación previa** de tarifa en apps antes de solicitar (ya usada en 3.5).

**Criterio de aceptación:** un viaje calcula su tarifa desde `pricing-engine`, se cobra por el método elegido y genera recibo.

---

### Fase 7 — Capa B2B / corporativa (2 semanas)

**Objetivo:** implementar los modelos B2B ya diseñados en el esquema (hoy sin código).

- [ ] **7.1 — CorporateAccount**: CRUD, límite de crédito, términos de pago.
- [ ] **7.2 — CostCenter**: centros de costo por empresa.
- [ ] **7.3 — CorporateReservation**: reservas programadas (`scheduledAt`) ligadas a `TripRequest` + centro de costo.
- [ ] **7.4 — Reportes corporativos reales**: completar `corporate-reports` (hoy solo JSON): poblar `periodStart/End`, exportar a Excel (`xlsx`), guardar `fileUrl`, respetar el DTO.
- [ ] **7.5 — ComplianceRecord (Bolivia)**: gestión de TIC/CUDAP/NIT/registro de comercio + alertas de vencimiento.
- [ ] **7.6 — DriverDocument**: carga y verificación de documentos del conductor (licencia, seguros) con vencimientos.
- [ ] **7.7 — Facturación fiscal** ligada a NIT (integración con normativa boliviana).

**Criterio de aceptación:** una empresa cliente reserva viajes con centro de costo y descarga un reporte de gastos del periodo.

---

### Fase 8 — Telefonía / VoIP (Asterisk) (3 semanas)

**Objetivo:** construir el servicio de telefonía (greenfield) para el flujo de despacho tradicional por llamada.

- [ ] **8.1 — Infra Asterisk**: contenedor Asterisk + config SIP en `infrastructure/`.
- [ ] **8.2 — Integración ARI/AMI** en `services/telephony` (cliente Node, dependencias reales).
- [ ] **8.3 — Identificación de llamada** (`CallerProfile`): al entrar llamada, buscar/crear perfil por teléfono+empresa y mostrarlo al despachador (pop en dashboard vía socket).
- [ ] **8.4 — Grabación de llamadas** (`CallRecord`): `callUuid`, from/to, `recordingUrl`.
- [ ] **8.5 — Crear solicitud desde llamada**: el despachador convierte una llamada en `TripRequest` con datos precargados del `CallerProfile`.
- [ ] **8.6 — Enrutamiento/colas** básicas de llamadas.

**Criterio de aceptación:** una llamada entrante identifica al cliente en el dashboard y el despachador crea la solicitud en un clic.

---

### Fase 9 — Calidad, testing, CI/CD y observabilidad (continuo)

**Objetivo:** convertir el prototipo en software mantenible.

- [ ] **9.1 — Testing API**: Jest + `@nestjs/testing`. Unit para servicios (auth, pricing, trip lifecycle) y e2e para endpoints críticos. Meta: cobertura > 60% en el núcleo.
- [ ] **9.2 — Testing realtime**: pruebas de los handlers de socket (asignar/completar/GPS) con cliente socket.io de prueba.
- [ ] **9.3 — Testing apps**: React Testing Library / Jest para componentes clave.
- [ ] **9.4 — CI (GitHub Actions)**: lint + typecheck + build + tests en cada PR.
- [ ] **9.5 — CD**: build de imágenes Docker + despliegue (Coolify ya referenciado en labels docker-compose).
- [ ] **9.6 — Linter/formatter**: ESLint + Prettier config en la raíz, aplicado a todos los workspaces (hoy `lint` no está implementado en los workspaces).
- [ ] **9.7 — Manejo de errores global** en API (filtro de excepciones) y logging estructurado (pino/winston).
- [ ] **9.8 — Observabilidad**: healthchecks (`/health`), métricas (Prometheus), y trazas básicas.
- [ ] **9.9 — Documentación API**: Swagger/OpenAPI (`@nestjs/swagger`) autogenerada.
- [ ] **9.10 — Migraciones**: pasar de la baseline única a migraciones versionadas por cambio; documentar flujo `prisma migrate`.
- [ ] **9.11 — Secrets/config**: gestión de secretos para producción (no `.env` en repo), validación de env con `zod`/`joi`.

---

## 6. Deuda técnica transversal

- [ ] **DT1 — Activar `packages/shared`.** Consolidar tipos (`AuthUser`, `TripDetail`, `FareBreakdown`) y utils (`formatCurrency`, geo/Haversine) y consumirlos desde las 3 apps + servicios. Eliminar duplicados.
- [ ] **DT2 — Eliminar todos los `any`/`as any`** del API tras regenerar el cliente Prisma.
- [ ] **DT3 — Producción de mapas**: OSRM/Nominatim públicos son rate-limited y no aptos para producción. Evaluar self-host o proveedor (Mapbox/Google) con API key + caché.
- [ ] **DT4 — Limpieza de repo**: binarios `handle*.exe`, `*.zip`, `temp_contents.txt`, carpeta `openrouter/` (revisar si aplica) fuera del control de versiones.
- [ ] **DT5 — Consistencia de escritura de ubicación** entre API y realtime (evitar dos caminos que escriban `currentLat/Lng`).
- [ ] **DT6 — README**: actualizar los "Próximos pasos" y enlazar este plan.

---

## 7. Métricas de éxito

| Métrica | Estado hoy | Meta |
|---|---|---|
| Workspaces que compilan/arrancan | ~3/8 | 8/8 |
| Superficies con auth | 2/4 | 4/4 |
| Cobertura de tests (núcleo) | 0% | > 60% |
| Ciclo de vida del viaje completo | Parcial | Completo con estados intermedios |
| Apps de cliente funcionales | 1/2 (conductor parcial) | 2/2 |
| Duplicación de lógica de precios | 3 sitios | 1 (`pricing-engine`) |
| CI/CD | Ninguno | Lint+build+test+deploy |

---

### Registro de cambios del plan

| Fecha | Cambio |
|---|---|
| 2026-07-09 | Creación del plan a partir del diagnóstico completo del monorepo. |
| 2026-07-10 | Fase 0: completadas 0.1 (B1–B7), 0.5, 0.6, 0.7, 0.8. 0.2/0.3 bloqueadas por entorno (Node 26); 0.4 parcial. |
