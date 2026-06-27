# RadioTaxi - App del Conductor

App móvil (Expo / React Native) para conductores de radiotaxi.

Permite recibir asignaciones de viaje en tiempo real, ver los detalles del viaje
(origen, destino, cliente), enviar la posición GPS al despachador y completar
el viaje con cálculo automático de tarifa.

## Funcionalidades (MVP)

- 🔐 **Login** con JWT (comparte autenticación con la API NestJS)
- 📡 **Tiempo real** vía Socket.io: recibe viajes asignados al instante
- 📍 **GPS** enviado cada 5 segundos para que el despachador vea la flota en vivo
- 🚕 **Detalle del viaje**: origen, destino, datos del cliente
- 💵 **Cierre con tarifa automática**: al completar, el backend calcula y devuelve el desglose
- 🔒 **Control de rol**: solo cuentas `DRIVER` o `ADMIN` pueden usar la app

## Requisitos

- Backend (API + Realtime) corriendo. Ver [README raíz](../../README.md).
- Node 18+ y Expo CLI.
- Emulador Android/iOS o la app **Expo Go** en un dispositivo físico.

## Configuración

### 1. Variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con las URLs de tu backend:

```
EXPO_PUBLIC_API_URL=http://TU_IP:3000/api
EXPO_PUBLIC_REALTIME_URL=http://TU_IP:3002
```

> En un dispositivo físico usa la IP de tu PC en la red local (no `localhost`).

### 2. Instalar dependencias

```bash
npm install --legacy-peer-deps
```

### 3. Iniciar

```bash
npm start
# o
npx expo start
```

Esto abre el panel de Expo. Escanea el QR con **Expo Go** o presiona
`a` (Android) / `i` (iOS) para abrir un emulador.

## Permisos

La app solicita permiso de **ubicación en primer plano** para enviar la posición GPS.
En iOS y Android se solicita automáticamente al abrir la pantalla de viaje.

## Estructura

```
apps/driver-app/
├── App.tsx                    # Entry point + navegación (Login / Trip)
├── app.json                   # Configuración Expo
├── .env.example               # Variables de entorno
└── src/
    ├── types.ts               # Tipos compartidos (TripDetail, AuthUser, ...)
    ├── api.ts                 # Cliente HTTP (login, fetchTrip)
    ├── socket.ts              # Singleton de Socket.io
    ├── auth-context.tsx       # Contexto de auth + AsyncStorage
    └── screens/
        ├── LoginScreen.tsx    # Pantalla de login
        └── TripScreen.tsx     # Pantalla principal (viajes + GPS)
```

## Flujo de uso

1. El conductor inicia sesión con su cuenta `DRIVER`
2. La app se conecta al realtime y queda "en línea"
3. El despachador asigna un viaje → aparece en la app con alerta
4. El conductor ve origen/destino/cliente y su GPS se envía automáticamente
5. Al finalizar, presiona **Completar viaje** → se calcula la tarifa y se muestra el desglose
