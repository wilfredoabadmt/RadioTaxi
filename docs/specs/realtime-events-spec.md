# Especificación de Eventos en Tiempo Real (AsyncAPI / WebSocket Contract) — RadioTaxi SaaS

> **Versión:** 1.0.0 (SDD Level 3)  
> **Protocolo:** Socket.io (WebSocket + Polling fallback)  
> **Servicio:** `services/realtime` (Puerto 3002)  
> **Fuente de verdad de tipos:** `packages/shared/types`

---

## 1. Modelo de Seguridad y Handshake

Toda conexión hacia `services/realtime` requiere autenticación por token JWT en el handshake:

```typescript
const socket = io('http://localhost:3002', {
  auth: {
    token: '<JWT_ACCESS_TOKEN>'
  }
});
```

### Rechazo de Conexión:
- Si el token no es provisto o es inválido/expirado, la conexión se rechaza con:
  `Authentication error: Token inválido o no provisto`.

### Contexto de Socket (`socket.data.user`):
- `id`: `number` (User ID)
- `email`: `string`
- `role`: `'ADMIN' | 'DISPATCHER' | 'DRIVER' | 'USER'`
- `companyId`: `number | null`

---

## 2. Arquitectura de Salas (`Rooms`)

Para evitar la fuga de datos y el broadcast masivo ineficiente, los sockets se agrupan en salas:

| Sala | Formato | Miembros | Propósito |
|---|---|---|---|
| **Empresa** | `company:{companyId}` | Despachadores y Administradores de la empresa | Monitoreo de toda la flota y solicitudes de la empresa. |
| **Viaje** | `trip:{tripId}` | Pasajero solicitante + Conductor asignado + Despacho | Telemetría GPS en vivo y cambios de estado del viaje específico. |
| **Conductor** | `driver:{driverId}` | Conductor individual | Ofertas de viajes directas (`trip:offer`), alertas y despachos. |

---

## 3. Eventos Cliente ➔ Servidor (Inbound)

### 3.1. `trip:assign`
Asigna una solicitud de viaje a un vehículo/conductor específico.
- **Roles permitidos:** `ADMIN`, `DISPATCHER`
- **Payload:**
  ```json
  {
    "tripRequestId": 105,
    "vehicleId": 12
  }
  ```
- **Respuesta / Efecto:**
  - Crea o actualiza el registro en la BD (`TripRequest.status = 'ACCEPTED'`, crea `Trip.status = 'ASSIGNED'`).
  - Marca vehículo y conductor como `busy`.
  - Emite `trip:status_changed` a la sala `trip:{tripId}` y `trip-requests:update` a la empresa.

### 3.2. `trip:start`
Indica que el pasajero ha abordado y el viaje comienza.
- **Roles permitidos:** `DRIVER` (asignado al viaje), `DISPATCHER`, `ADMIN`
- **Payload:**
  ```json
  {
    "tripId": 42
  }
  ```
- **Efecto:** Transición legal `ARRIVED → IN_PROGRESS`. Emite `trip:status_changed`.

### 3.3. `trip:arrived`
Indica que el conductor ha llegado al punto de recogida del pasajero.
- **Roles permitidos:** `DRIVER`
- **Payload:**
  ```json
  {
    "tripId": 42
  }
  ```
- **Efecto:** Transición legal `ASSIGNED → ARRIVED`. Notifica al pasajero.

### 3.4. `trip:complete`
Finaliza el viaje, calcula la tarifa final y libera los recursos.
- **Roles permitidos:** `DRIVER` (asignado al viaje), `DISPATCHER`, `ADMIN`
- **Payload:**
  ```json
  {
    "tripId": 42,
    "vehicleId": 12
  }
  ```
- **Efecto:**
  - Calcula la tarifa con `services/pricing-engine`.
  - Persiste el recibo `TripFare`.
  - Libera conductor y vehículo (`status = 'available'`).
  - Emite `trip:status_changed` (`status: 'COMPLETED'`) y actualiza la flota.

### 3.5. `trip:cancel`
Cancela un viaje activo o solicitud.
- **Roles permitidos:** `USER` (dueño), `DRIVER` (asignado), `DISPATCHER`, `ADMIN`
- **Payload:**
  ```json
  {
    "tripId": 42,
    "reason": "Pasajero no se presentó"
  }
  ```
- **Efecto:** Libera recursos y actualiza estados en cascada.

### 3.6. `vehicle:update`
Emisión periódica de telemetría GPS del vehículo.
- **Roles permitidos:** `DRIVER` (dueño del vehículo)
- **Frecuencia recomendada:** 3 a 5 segundos
- **Payload:**
  ```json
  {
    "vehicleId": 12,
    "lat": -16.5034,
    "lng": -68.1312,
    "speed": 34.5
  }
  ```
- **Efecto:**
  - Si el vehículo está `available`: difunde a la sala `company:{companyId}` para visualización en mapa de despacho.
  - Si el vehículo está en viaje activo: difunde también a la sala `trip:{tripId}` para seguimiento del pasajero.

---

## 4. Eventos Servidor ➔ Cliente (Outbound)

### 4.1. `vehicles:update`
Lista completa o delta de vehículos y sus ubicaciones en tiempo real para el despacho.
- **Audiencia:** Sala `company:{companyId}`
- **Payload:** `VehicleDTO[]`

### 4.2. `trip-requests:update`
Lista de solicitudes pendientes o en curso para la cola del despacho.
- **Audiencia:** Sala `company:{companyId}`
- **Payload:** `TripRequestDTO[]`

### 4.3. `trip:status_changed`
Notificación inmediata de cambio de estado en la máquina de estados del viaje.
- **Audiencia:** Sala `trip:{tripId}`
- **Payload:** `TripDTO`

### 4.4. `vehicle:location_changed`
Actualización granular de posición de un vehículo particular para animación suave en mapas.
- **Audiencia:** Sala `trip:{tripId}` y `company:{companyId}`
- **Payload:**
  ```json
  {
    "vehicleId": 12,
    "lat": -16.5034,
    "lng": -68.1312
  }
  ```
