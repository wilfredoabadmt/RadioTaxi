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

## Próximos pasos

1. Instalar PostgreSQL y ejecutar schema.sql
2. Configurar Asterisk para VoIP
3. Añadir integración WebSocket para tiempo real
4. Implementar autenticación y seguridad
