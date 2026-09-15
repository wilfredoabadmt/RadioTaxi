# RadioTaxi SaaS Platform

Plataforma SaaS multi-empresa para modernizar flotas de radiotaxi en Bolivia y Latinoamérica con despacho en tiempo real asistido por IA, telefonía VoIP Asterisk con pop-up interactivo, tarificación dinámica, facturación fiscal SIN (SIAT), gestión corporativa B2B y observabilidad completa.

---

## 🏛️ Arquitectura del Sistema

```text
                                  ┌────────────────────────┐
   Dashboard (Next.js :3001) ───► │      services/api      │ ◄──── PostgreSQL (Prisma ORM)
   App Conductor (Expo) ────────► │   NestJS REST + JWT    │
   App Pasajero (Expo) ─────────► │   Swagger Docs :3000   │
                                  └───────────┬────────────┘
                                              │ (JWT Auth Compartida)
                                  ┌───────────▼────────────┐
   Todos los clientes ──────────► │   services/realtime    │ ◄──── PostgreSQL (Prisma ORM)
   (WebSockets Socket.io :3002)   │   Rooms por Empresa    │
                                  └───────────┬────────────┘
                                              │ (HTTP / Pure Lib)
       ┌──────────────────────────────────────┴──────────────────────────────────────┐
       ▼                                                                             ▼
┌────────────────────────┐                                                ┌────────────────────────┐
│ services/pricing-engine│                                                │   services/telephony   │
│ Microservicio HTTP     │                                                │ Gateway ARI/AMI Node   │
│ Puerto :3005           │                                                │ Puerto :3004           │
└────────────────────────┘                                                └───────────┬────────────┘
                                                                                      │ (SIP / RTP)
                                                                          ┌───────────▼────────────┐
                                                                          │      asterisk:20       │
                                                                          │  PBX VoIP & Grabación  │
                                                                          └────────────────────────┘
```

---

## 📦 Estructura del Monorepo

```text
RadioTaxi/
├── apps/
│   ├── dispatch-dashboard/   # Panel de despacho operativo Next.js (Tailwind + Leaflet)
│   ├── driver-app/           # App móvil de conductor (Expo / React Native)
│   └── client-app/           # App móvil de pasajero (Expo / React Native)
├── services/
│   ├── api/                  # Backend REST en NestJS (Auth, Trips, Fleet, Payments, B2B)
│   ├── realtime/             # Servidor WebSocket Socket.io (Despacho, GPS, Eventos en vivo)
│   ├── pricing-engine/       # Microservicio y librería de cálculo de tarifas y horarios pico
│   └── telephony/            # Gateway Node.js para telefonía Asterisk (ARI / AMI)
├── packages/
│   └── shared/               # Contratos compartidos (types) y utilidades geodésicas (utils)
├── infrastructure/
│   └── asterisk/             # Dockerfile y configs PJSIP / Dialplan de Asterisk 20 LTS
├── docker-compose.yaml        # Despliegue completo orquestado
└── .github/workflows/ci.yml  # Pipeline de CI (Lint, Typecheck, 47 Jest Tests, Docker Builds)
```

---

## 🚀 Puertos y Servicios en Desarrollo

| Servicio | Tecnología | Puerto Local | Descripción / Endpoint |
|---|---|---|---|
| **API Backend** | NestJS 10 | `http://localhost:3000` | REST API, Swagger en `/docs`, Salud en `/health`, Métricas en `/metrics` |
| **Dashboard** | Next.js 14 | `http://localhost:3001` | Centro de despacho en vivo, mapa, flota, facturas y call center |
| **Realtime** | Socket.io | `http://localhost:3002` | Eventos en tiempo real, telemetría GPS, máquina de estados |
| **Telephony** | Node.js Express | `http://localhost:3004` | Gateway Asterisk ARI/AMI y simulador de llamadas |
| **Pricing Engine** | Node.js Microservice | `http://localhost:3005` | Motor de cálculo de tarifas y geocercas (`POST /price`) |
| **Asterisk PBX** | Asterisk 20 LTS | `5060/udp`, `8088/tcp` | Servidor SIP, servidor HTTP ARI (`/ari`) y puertos RTP |
| **PostgreSQL** | PostgreSQL 16 | `localhost:5432` | Base de datos relacional multi-inquilino |

---

## 🛠️ Guía de Inicio Rápido

### 1. Prerrequisitos
- Node.js LTS (v20 o superior recomendado)
- Docker y Docker Compose
- npm v10

### 2. Instalación de dependencias

```bash
npm install --legacy-peer-deps
```

### 3. Configuración de variables de entorno

```bash
# Backend REST API
cp services/api/.env.example services/api/.env

# Realtime WebSocket
cp services/realtime/.env.example services/realtime/.env

# Dispatch Dashboard
cp apps/dispatch-dashboard/.env.example apps/dispatch-dashboard/.env.local
```

### 4. Base de Datos y Semilla Inicial (Prisma)

```bash
# 1. Levantar contenedor de base de datos
docker-compose up -d postgres

# 2. Generar cliente Prisma y ejecutar migraciones
npx prisma generate --schema=services/api/prisma/schema.prisma
npx prisma migrate deploy --schema=services/api/prisma/schema.prisma

# 3. Cargar datos de prueba (La Paz / Bolivia)
npm run prisma:seed -w services/api
```

### 5. Iniciar la Plataforma

#### Opción A: Stack completo con Docker Compose

```bash
docker-compose up -d
```

#### Opción B: Ejecución modular en terminales

```bash
# Terminal 1: Backend API (Puerto 3000)
npm run dev -w services/api

# Terminal 2: Servidor Realtime (Puerto 3002)
npm run dev -w services/realtime

# Terminal 3: Motor de Precios (Puerto 3005)
npm run dev -w services/pricing-engine

# Terminal 4: Gateway de Telefonía (Puerto 3004)
npm run dev -w services/telephony

# Terminal 5: Panel de Despacho (Puerto 3001)
npm run dev -w apps/dispatch-dashboard
```

---

## 📋 Módulos y Funcionalidades Principales

### 1. Despacho Asistido por Inteligencia Artificial
- Integración con **Google Gemini** para análisis geoespacial de flotas (`POST /api/ai/dispatch/suggest`).
- Sugiere la unidad óptima evaluando cercanía al pasajero, historial del conductor y estado del vehículo.
- **Degradación elegante**: si la API de IA no está disponible, cae de manera automática y transparente a una heurística determinista Haversine sin bloquear el despacho.

### 2. Telefonía VoIP y Despacho Telefónico en 1-Clic
- Contenedor **Asterisk 20 LTS** con grabación de llamadas estéreo MixMonitor (`infrastructure/asterisk/`).
- Pop-up interactivo en tiempo real ([`IncomingCallModal.tsx`](apps/dispatch-dashboard/components/telephony/IncomingCallModal.tsx)) en el panel ante llamadas entrantes.
- Detección de clientes frecuentes (`CallerProfile`), direcciones habituales de recogida y despacho de viaje con 1 solo clic.
- Simulador local de llamadas para pruebas:
  - `POST http://localhost:3004/simulate/incoming-call` (Simula timbrado de cliente)
  - `POST http://localhost:3004/simulate/answer` (Simula descuelgue)
  - `POST http://localhost:3004/simulate/hangup` (Simula fin de llamada con duración)

### 3. Facturación Fiscal y Pagos (Normativa Bolivia SIN / SIAT)
- **Código de Control v7**: Generación algorítmica con Verhoeff y cifrado AllegedRC4.
- **Código QR Tributario**: Formato interoperable del Servicio de Impuestos Nacionales (SIN).
- **Crédito Fiscal IVA**: Cálculo automático del 13% IVA.
- Modal de emisión e impresión directa en `/trips` con leyendas obligatorias según Ley N° 453.
- Pagos multicanal: Efectivo, Tarjeta y **QR Simple Bolivia** interoperable (BCP, BNB, Banco Unión).

### 4. Capa B2B y Cuentas Corporativas
- Gestión de líneas de crédito corporativas (`CorporateAccount`) con control de saldo consumido/disponible.
- Centros de costo departamentales (`CostCenter`) por empresa cliente.
- Reservas corporativas programadas atómicas (`CorporateReservation`) ligadas a solicitudes de viaje.
- Generación y descarga directa de reportes de consumo en libros **Excel `.xlsx`** en `/reports`.

### 5. Flota, Documentación y Cumplimiento Regulatorio
- Control de vencimiento de documentos del chofer: **SOAT**, Licencia de Conducir, Inspección Técnica Vehicular (ITV).
- Validación de **Tarjeta de Identificación del Conductor (TIC)** y código policial **CUDAP**.

---

## 🧪 Pruebas Automatizadas y Calidad

El proyecto cuenta con una cobertura integral de pruebas unitarias:

```bash
# Ejecutar pruebas unitarias de la API REST (40 pruebas Jest)
npm test -w services/api

# Ejecutar pruebas unitarias del servidor Realtime (7 pruebas Jest)
npm test -w services/realtime

# Verificación de compilación estricta en todos los workspaces
npx tsc --noEmit -p services/api/tsconfig.json
npx tsc --noEmit -p services/realtime/tsconfig.json
npx tsc --noEmit -p services/telephony/tsconfig.json
npx tsc --noEmit -p services/pricing-engine/tsconfig.json
npx tsc --noEmit -p apps/dispatch-dashboard/tsconfig.json
npx tsc --noEmit -p packages/shared/types/tsconfig.json
```

---

## 📖 Documentación y Especificaciones

- **OpenAPI / Swagger Interactivo**: Visita `http://localhost:3000/docs` con la API en ejecución.
- **Especificación de Eventos Realtime**: [`docs/specs/realtime-events-spec.md`](docs/specs/realtime-events-spec.md).
- **Plan de Desarrollo Detallado y Seguimiento**: [`docs/PLAN-DESARROLLO.md`](docs/PLAN-DESARROLLO.md).
