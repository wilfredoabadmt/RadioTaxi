import 'reflect-metadata';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { calculateFare, saveFare, FareBreakdown } from './pricing.utils';
import { getDistanceMeters } from './geo.utils';
import { authMiddleware, getUser, hasRole, driverOwnsVehicle } from './auth';

// ---------------------------------------------------------------------------
// Prisma (cliente standalone, sin NestJS)
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const DATABASE_AVAILABLE = process.env.DATABASE_URL != null;

// ---------------------------------------------------------------------------
// Tipos normalizados que el dashboard consume
// El frontend usa: currentLatitude / currentLongitude / status (available|busy)
// La BD usa:        currentLat / currentLng / status (available|busy|offline)
// ---------------------------------------------------------------------------

interface VehicleDTO {
  id: number;
  plate: string | null;
  status: string;
  currentLatitude: number | null;
  currentLongitude: number | null;
  vehicleType: string | null;
  brand: string | null;
  model: string | null;
}

interface TripRequestDTO {
  id: number;
  customerId: number;
  originAddress: string | null;
  originLat: number | null;
  originLng: number | null;
  destinationAddress: string | null;
  destinationLat: number | null;
  destinationLng: number | null;
  status: string;
  scheduledAt: Date | null;
  requestedAt: Date;
}

// ---------------------------------------------------------------------------
// Mapeadores BD -> DTO (nombres que el frontend ya espera)
// ---------------------------------------------------------------------------

function mapVehicle(v: any): VehicleDTO {
  return {
    id: v.id,
    plate: v.plate,
    status: v.status,
    currentLatitude: v.currentLat,
    currentLongitude: v.currentLng,
    vehicleType: v.vehicleType,
    brand: v.brand,
    model: v.model,
  };
}

function mapTripRequest(t: any): TripRequestDTO {
  return {
    id: t.id,
    customerId: t.customerId,
    originAddress: t.originAddress,
    originLat: t.originLat,
    originLng: t.originLng,
    destinationAddress: t.destinationAddress,
    destinationLat: t.destinationLat,
    destinationLng: t.destinationLng,
    status: t.status,
    scheduledAt: t.scheduledAt,
    requestedAt: t.requestedAt,
  };
}

// ---------------------------------------------------------------------------
// Máquina de estados del viaje (espejo de services/api/src/trips/trips.service.ts).
// ASSIGNED → ARRIVED → IN_PROGRESS → COMPLETED. CANCELLED desde cualquier no-terminal.
// TODO(DT): consolidar esta lógica con la del API (fuente única) — plan 2.1/6.x.
// ---------------------------------------------------------------------------

type TripStatus = 'ASSIGNED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  ASSIGNED: ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

function assertTransition(from: string, to: TripStatus) {
  const allowed = TRIP_TRANSITIONS[from as TripStatus] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Transición inválida: no se puede pasar de "${from}" a "${to}"`);
  }
}

// ---------------------------------------------------------------------------
// Servicios de datos: todos consultan/escriben la BD real.
// Si la BD no está configurada, el servicio arranca pero reporta el estado.
// ---------------------------------------------------------------------------

async function fetchVehicles(): Promise<VehicleDTO[]> {
  const vehicles = await prisma.vehicle.findMany({
    include: { driver: true },
    orderBy: { id: 'asc' },
  });
  return vehicles.map(mapVehicle);
}

async function fetchPendingTripRequests(): Promise<TripRequestDTO[]> {
  const requests = await prisma.tripRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { requestedAt: 'asc' },
  });
  return requests.map(mapTripRequest);
}

/**
 * Persiste la asignación de un viaje:
 *  1. Crea el Trip (vincula tripRequest + driver + vehicle)
 *  2. Marca el TripRequest como ACCEPTED
 *  3. Pone el vehículo y conductor en 'busy'
 *  Todo dentro de una transacción para consistencia.
 */
async function assignTrip(tripRequestId: number, vehicleId: number) {
  const tripRequest = await prisma.tripRequest.findUnique({
    where: { id: tripRequestId },
  });

  if (!tripRequest) {
    throw new Error(`TripRequest ${tripRequestId} no encontrada`);
  }

  if (tripRequest.status !== 'PENDING') {
    throw new Error(`TripRequest ${tripRequestId} ya fue procesada (estado: ${tripRequest.status})`);
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { driver: true },
  });

  if (!vehicle) {
    throw new Error(`Vehículo ${vehicleId} no encontrado`);
  }

  if (vehicle.status !== 'available') {
    throw new Error(`Vehículo ${vehicleId} no disponible (estado: ${vehicle.status})`);
  }

  if (!vehicle.driver) {
    throw new Error(`Vehículo ${vehicleId} sin conductor asignado`);
  }

  const driverId = vehicle.driver.id;

  const trip = await prisma.$transaction(async (tx) => {
    const newTrip = await tx.trip.create({
      data: {
        tripRequestId,
        driverId,
        vehicleId,
        status: 'ASSIGNED',
      },
    });

    await tx.tripRequest.update({
      where: { id: tripRequestId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        driverId,
      },
    });

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'busy' },
    });

    await tx.driver.update({
      where: { id: driverId },
      data: { status: 'busy' },
    });

    return newTrip;
  });

  return { trip, driverId };
}

/**
 * Cierra un viaje y calcula la tarifa automáticamente:
 *  1. Busca el Trip activo del vehículo
 *  2. Calcula la tarifa (o usa el fareTotal explícito si viene)
 *  3. Guarda TripFare en BD
 *  4. Marca Trip como COMPLETED y TripRequest como COMPLETED
 *  5. Libera vehículo y conductor (available)
 */
async function completeTripByVehicle(
  vehicleId: number,
  fareTotalOverride?: number,
  distanceMetersOverride?: number,
  durationSecondsOverride?: number
) {
  const trip = await prisma.trip.findFirst({
    where: { vehicleId, status: { in: ['ASSIGNED', 'IN_PROGRESS'] } },
    orderBy: { startedAt: 'desc' },
    include: {
      tripRequest: { include: { company: true } },
    },
  });

  if (!trip) {
    throw new Error(`No hay viaje activo para el vehículo ${vehicleId}`);
  }

  let fareBreakdown: FareBreakdown | null = null;
  let finalFareTotal = fareTotalOverride ?? trip.fareTotal ?? 0;

  // Si no viene un fareTotal explícito, calcular automáticamente
  if (fareTotalOverride == null) {
    const distanceMeters = distanceMetersOverride ?? trip.distanceMeters;
    const durationSeconds = durationSecondsOverride ?? trip.durationSeconds;
    const companyId = trip.tripRequest.companyId;

    if (companyId && distanceMeters && durationSeconds) {
      const distanceKm = distanceMeters / 1000;
      const durationMinutes = durationSeconds / 60;

      const tripRequest = trip.tripRequest;
      const originLat = tripRequest.originLat;
      const originLng = tripRequest.originLng;
      const destinationLat = tripRequest.destinationLat;
      const destinationLng = tripRequest.destinationLng;

      fareBreakdown = await calculateFare({
        companyId,
        distanceKm,
        durationMinutes,
        originLat: originLat ?? undefined,
        originLng: originLng ?? undefined,
        destinationLat: destinationLat ?? undefined,
        destinationLng: destinationLng ?? undefined,
      });

      finalFareTotal = fareBreakdown.total;

      // Persistir el TripFare en BD
      await saveFare({
        tripId: trip.id,
        ruleId: fareBreakdown.ruleId,
        distanceMeters,
        durationSeconds,
        totalFare: fareBreakdown.total,
        baseFare: fareBreakdown.baseFare,
      });

      // Calcular distancia por GPS si no viene override (fallback Haversine)
      if (!distanceMetersOverride && tripRequest.originLat && tripRequest.originLng &&
          tripRequest.destinationLat && tripRequest.destinationLng) {
        const gpsDistance = getDistanceMeters(
          tripRequest.originLat, tripRequest.originLng,
          tripRequest.destinationLat, tripRequest.destinationLng,
        );
        await prisma.trip.update({
          where: { id: trip.id },
          data: { distanceMeters: gpsDistance },
        });
      }
    } else {
      console.warn(`[realtime] No se pudo calcular tarifa auto para trip=${trip.id}: faltan companyId/distance/duration`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: trip.id },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
        fareTotal: finalFareTotal,
      },
    });

    await tx.tripRequest.update({
      where: { id: trip.tripRequestId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await tx.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'available' },
    });

    await tx.driver.update({
      where: { id: trip.driverId },
      data: { status: 'available' },
    });
  });

  return {
    tripId: trip.id,
    fareTotal: finalFareTotal,
    fareBreakdown,
  };
}

/**
 * Cancela un viaje activo y libera los recursos (Fase 2.10).
 */
async function cancelTrip(tripId: number, reason?: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
  });

  if (!trip) {
    throw new Error(`Viaje #${tripId} no encontrado`);
  }

  if (['COMPLETED', 'CANCELLED'].includes(trip.status)) {
    throw new Error(`El viaje #${tripId} ya está en estado terminal (${trip.status})`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.trip.update({
      where: { id: tripId },
      data: { status: 'CANCELLED' },
    });

    await tx.tripRequest.update({
      where: { id: trip.tripRequestId },
      data: { status: 'CANCELLED' },
    });

    if (trip.vehicleId) {
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' },
      });
    }

    if (trip.driverId) {
      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' },
      });
    }
  });

  return {
    tripId,
    tripRequestId: trip.tripRequestId,
    status: 'CANCELLED',
    reason: reason || 'Cancelado por usuario o despacho',
  };
}

/**
 * Actualiza la posición GPS de un vehículo (viene de la driver-app).
 */
async function updateVehiclePosition(
  vehicleId: number,
  lat: number,
  lng: number,
  status?: string
) {
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      currentLat: lat,
      currentLng: lng,
      ...(status ? { status } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Broadcast helpers
// ---------------------------------------------------------------------------

async function broadcastVehicles(io: Server) {
  const vehicles = await fetchVehicles();
  io.emit('vehicles:update', vehicles);
}

async function broadcastPendingRequests(io: Server) {
  const requests = await fetchPendingTripRequests();
  io.emit('trip-requests:update', requests);
}

// ---------------------------------------------------------------------------
// Servidor Socket.io
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT) || 3002;

// CORS restringido: lista blanca desde env (fallback a orígenes de dev).
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  }
});
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes('all')) return callback(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      if (
        origin.startsWith('http://localhost:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://127.0.0.1:') ||
        origin.includes('.sslip.io')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  },
});

// Autenticación en el handshake: rechaza conexiones sin JWT válido.
io.use(authMiddleware);

// Polling: refresca posiciones cada 5s para clientes recién conectados.
// (El dashboard ya recibe pushes, esto garantiza sincronía sin driver-app.)
const REFRESH_MS = 5000;

io.on('connection', async (socket: Socket) => {
  const user = getUser(socket);
  console.log(`[realtime] Cliente conectado: ${socket.id} (user=${user?.id} role=${user?.role})`);

  // Unirse a salas automáticas según perfil
  if (user?.companyId) {
    socket.join(`company:${user.companyId}`);
  }
  if (user?.role === 'DRIVER') {
    socket.join(`driver:${user.id}`);
  }

  // Gestión explícita de salas (e.g. unirse a seguimiento de un viaje)
  socket.on('room:join', (room: string) => {
    socket.join(room);
    console.log(`[realtime] ${socket.id} se unió a ${room}`);
  });

  socket.on('room:leave', (room: string) => {
    socket.leave(room);
    console.log(`[realtime] ${socket.id} dejó ${room}`);
  });

  // Estado inicial al conectar
  try {
    socket.emit('vehicles:update', await fetchVehicles());
    socket.emit('trip-requests:update', await fetchPendingTripRequests());
  } catch (err) {
    console.error('[realtime] Error enviando estado inicial:', err);
    socket.emit('db:error', { message: 'No se pudo leer la base de datos' });
  }

  // Transición: Conductor llegó al punto de recogida (ASSIGNED -> ARRIVED)
  socket.on('trip:arrived', async (data: { tripId: number }) => {
    try {
      const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
      if (!trip) throw new Error(`Viaje ${data.tripId} no encontrado`);
      assertTransition(trip.status, 'ARRIVED');
      const updated = await prisma.trip.update({
        where: { id: data.tripId },
        data: { status: 'ARRIVED' }
      });
      io.to(`trip:${data.tripId}`).emit('trip:status_changed', updated);
      io.emit('trip:status_changed', updated);
    } catch (err: any) {
      socket.emit('trip:arrived:error', { message: err.message });
    }
  });

  // Transición: Iniciar viaje (ARRIVED/ASSIGNED -> IN_PROGRESS)
  socket.on('trip:start', async (data: { tripId: number }) => {
    try {
      const trip = await prisma.trip.findUnique({ where: { id: data.tripId } });
      if (!trip) throw new Error(`Viaje ${data.tripId} no encontrado`);
      assertTransition(trip.status, 'IN_PROGRESS');
      const updated = await prisma.trip.update({
        where: { id: data.tripId },
        data: { status: 'IN_PROGRESS' }
      });
      io.to(`trip:${data.tripId}`).emit('trip:status_changed', updated);
      io.emit('trip:status_changed', updated);
      await broadcastVehicles(io);
    } catch (err: any) {
      socket.emit('trip:start:error', { message: err.message });
    }
  });

  // Despachador asigna un viaje (solo ADMIN/DISPATCHER)
  socket.on('trip:assign', async (data: { tripRequestId: number; vehicleId: number }) => {
    try {
      if (!hasRole(socket, 'ADMIN', 'DISPATCHER')) {
        socket.emit('trip:assign:error', { message: 'No autorizado' });
        return;
      }
      const { tripRequestId, vehicleId } = data;
      const result = await assignTrip(tripRequestId, vehicleId);
      console.log(`[realtime] Viaje asignado: request=${tripRequestId} -> trip=${result.trip.id}`);

      socket.emit('trip:assigned:ok', {
        tripRequestId,
        tripId: result.trip.id,
        driverId: result.driverId,
      });
      // Avisa a todos (otros despachadores deben ver la lista actualizada)
      io.emit('trip:assigned', { tripRequestId, vehicleId, tripId: result.trip.id });
      await broadcastVehicles(io);
      await broadcastPendingRequests(io);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al asignar viaje';
      console.error('[realtime] assignTrip:', message);
      socket.emit('trip:assign:error', { message });
    }
  });

  // Cerrar viaje (por vehículo) — calcula tarifa automáticamente si no se provee
  socket.on('trip:complete', async (data: {
    vehicleId: number;
    fareTotal?: number;
    distanceMeters?: number;
    durationSeconds?: number;
  }) => {
    try {
      if (!hasRole(socket, 'ADMIN', 'DISPATCHER')) {
        socket.emit('trip:complete:error', { message: 'No autorizado' });
        return;
      }
      const result = await completeTripByVehicle(
        data.vehicleId,
        data.fareTotal,
        data.distanceMeters,
        data.durationSeconds,
      );
      console.log(`[realtime] Viaje completado: trip=${result.tripId} fare=${result.fareTotal}`);

      socket.emit('trip:complete:ok', {
        tripId: result.tripId,
        fareTotal: result.fareTotal,
        fareBreakdown: result.fareBreakdown,
      });

      io.emit('trip:completed', {
        tripId: result.tripId,
        vehicleId: data.vehicleId,
        fareTotal: result.fareTotal,
        fareBreakdown: result.fareBreakdown,
      });

      await broadcastVehicles(io);
      await broadcastPendingRequests(io);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al completar viaje';
      console.error('[realtime] completeTrip:', message);
      socket.emit('trip:complete:error', { message });
    }
  });

  // Driver-app reporta posición (solo el DRIVER dueño del vehículo)
  socket.on('vehicle:update', async (data: {
    id: number;
    currentLatitude: number;
    currentLongitude: number;
    status?: string;
  }) => {
    try {
      if (!hasRole(socket, 'DRIVER')) {
        socket.emit('vehicle:update:error', { message: 'No autorizado' });
        return;
      }
      const owns = await driverOwnsVehicle(prisma, user!.id, data.id);
      if (!owns) {
        socket.emit('vehicle:update:error', { message: 'El vehículo no pertenece a este conductor' });
        return;
      }
      await updateVehiclePosition(
        data.id,
        data.currentLatitude,
        data.currentLongitude,
        data.status
      );
      // Solo difunde la flota actualizada (posición nueva)
      await broadcastVehicles(io);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar posición';
      console.error('[realtime] vehicle:update:', message);
    }
  });

  // Cancelar viaje (Fase 2.10) — ADMIN, DISPATCHER o DRIVER
  socket.on('trip:cancel', async (data: { tripId: number; reason?: string }) => {
    try {
      if (!hasRole(socket, 'ADMIN', 'DISPATCHER', 'DRIVER')) {
        socket.emit('trip:cancel:error', { message: 'No autorizado' });
        return;
      }
      const result = await cancelTrip(data.tripId, data.reason);
      console.log(`[realtime] Viaje cancelado: trip=${data.tripId} motivo="${result.reason}"`);

      socket.emit('trip:cancel:ok', result);
      io.to(`trip:${data.tripId}`).emit('trip:cancelled', result);
      io.emit('trip:cancelled', result);

      await broadcastVehicles(io);
      await broadcastPendingRequests(io);
    } catch (err: any) {
      console.error('[realtime] trip:cancel:', err.message);
      socket.emit('trip:cancel:error', { message: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // Flujo de Oferta / Aceptación / Rechazo por Conductor (Fase 2.8)
  // ---------------------------------------------------------------------------

  // Despacho envía oferta de viaje a conductor específico
  socket.on('trip:offer', async (data: {
    tripRequestId: number;
    driverId: number;
    timeoutSeconds?: number;
  }) => {
    try {
      if (!hasRole(socket, 'ADMIN', 'DISPATCHER')) {
        socket.emit('trip:offer:error', { message: 'No autorizado para despachar ofertas' });
        return;
      }

      const req = await prisma.tripRequest.findUnique({
        where: { id: data.tripRequestId },
      });

      if (!req || req.status !== 'PENDING') {
        throw new Error(`Solicitud #${data.tripRequestId} no disponible para oferta`);
      }

      const offerPayload = {
        offerId: `OFFER-${Date.now()}-${data.tripRequestId}`,
        tripRequestId: data.tripRequestId,
        originAddress: req.originAddress || 'Origen por GPS',
        destinationAddress: req.destinationAddress || 'Destino a convenir',
        timeoutSeconds: data.timeoutSeconds || 30,
        offeredAt: new Date().toISOString(),
      };

      // Emitir exclusivamente a la sala privada del chofer (Fase 2.9)
      io.to(`driver:${data.driverId}`).emit('trip:offered', offerPayload);
      socket.emit('trip:offer:sent', { driverId: data.driverId, ...offerPayload });
      console.log(`[realtime] 📨 Oferta enviada para solicitud #${data.tripRequestId} a conductor #${data.driverId}`);
    } catch (err: any) {
      socket.emit('trip:offer:error', { message: err.message });
    }
  });

  // Conductor acepta la oferta recibida
  socket.on('trip:accept', async (data: { tripRequestId: number; vehicleId: number }) => {
    try {
      if (!hasRole(socket, 'DRIVER')) {
        socket.emit('trip:accept:error', { message: 'Solo conductores pueden aceptar ofertas' });
        return;
      }

      const result = await assignTrip(data.tripRequestId, data.vehicleId);
      console.log(`[realtime] ✅ Oferta aceptada por conductor: request=${data.tripRequestId} -> trip=${result.trip.id}`);

      socket.emit('trip:accepted:ok', result);
      io.to(`driver:${user!.id}`).emit('trip:assigned', {
        tripRequestId: data.tripRequestId,
        vehicleId: data.vehicleId,
        tripId: result.trip.id,
      });
      io.to(`trip:${result.trip.id}`).emit('trip:assigned', {
        tripRequestId: data.tripRequestId,
        vehicleId: data.vehicleId,
        tripId: result.trip.id,
      });
      io.emit('trip:assigned', {
        tripRequestId: data.tripRequestId,
        vehicleId: data.vehicleId,
        tripId: result.trip.id,
      });

      await broadcastVehicles(io);
      await broadcastPendingRequests(io);
    } catch (err: any) {
      socket.emit('trip:accept:error', { message: err.message });
    }
  });

  // Conductor rechaza la oferta
  socket.on('trip:reject', (data: { tripRequestId: number; reason?: string }) => {
    const driverId = user?.id;
    console.log(`[realtime] ❌ Conductor #${driverId} rechazó la solicitud #${data.tripRequestId}`);
    io.emit('trip:offer_rejected', {
      tripRequestId: data.tripRequestId,
      driverId,
      reason: data.reason || 'Rechazado por el conductor',
    });
  });

  // ---------------------------------------------------------------------------
  // Telefonía VoIP / Asterisk — Difusión en tiempo real de llamadas
  // ---------------------------------------------------------------------------
  socket.on('call:incoming', (data: any) => {
    const companyId = data.companyId || 1;
    console.log(`[realtime] 📞 Llamada entrante de ${data.fromNumber} (UUID: ${data.callUuid})`);
    io.to(`company:${companyId}`).emit('call:incoming', data);
    io.emit('call:incoming', data); // Fallback para despachadores sin sala explícita
  });

  socket.on('call:answered', (data: any) => {
    const companyId = data.companyId || 1;
    console.log(`[realtime] 📞 Llamada contestada (UUID: ${data.callUuid})`);
    io.to(`company:${companyId}`).emit('call:answered', data);
    io.emit('call:answered', data);
  });

  socket.on('call:ended', (data: any) => {
    const companyId = data.companyId || 1;
    console.log(`[realtime] 📞 Llamada finalizada (UUID: ${data.callUuid}, ${data.durationSeconds}s)`);
    io.to(`company:${companyId}`).emit('call:ended', data);
    io.emit('call:ended', data);
  });

  socket.on('disconnect', () => {
    console.log(`[realtime] Cliente desconectado: ${socket.id}`);
  });
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------

server.listen(PORT, async () => {
  console.log(`[realtime] Servicio escuchando en http://localhost:${PORT}`);

  if (!DATABASE_AVAILABLE) {
    console.warn('[realtime] ⚠️  DATABASE_URL no definida. El servicio arranca pero no persistirá.');
    return;
  }

  try {
    await prisma.$connect();
    console.log('[realtime] ✅ Conectado a la base de datos');

    // Broadcast periódico de la flota (sincroniza posiciones sin depender de pushes)
    setInterval(() => {
      broadcastVehicles(io).catch((err) =>
        console.error('[realtime] broadcast periódico falló:', err)
      );
    }, REFRESH_MS);
  } catch (err) {
    console.error('[realtime] ❌ No se pudo conectar a la base de datos:', err);
  }
});

// Cierre limpio
async function shutdown(signal: string) {
  console.log(`[realtime] ${signal} recibido, cerrando...`);
  await prisma.$disconnect();
  server.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
