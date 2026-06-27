import 'reflect-metadata';
import http from 'http';
import { Server, Socket } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { calculateFare, saveFare, FareBreakdown } from './pricing.utils';
import { getDistanceMeters } from './geo.utils';

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

const server = http.createServer();
const io = new Server(server, {
  cors: { origin: '*' },
});

// Polling: refresca posiciones cada 5s para clientes recién conectados.
// (El dashboard ya recibe pushes, esto garantiza sincronía sin driver-app.)
const REFRESH_MS = 5000;

io.on('connection', async (socket: Socket) => {
  console.log(`[realtime] Cliente conectado: ${socket.id}`);

  // Estado inicial al conectar
  try {
    socket.emit('vehicles:update', await fetchVehicles());
    socket.emit('trip-requests:update', await fetchPendingTripRequests());
  } catch (err) {
    console.error('[realtime] Error enviando estado inicial:', err);
    socket.emit('db:error', { message: 'No se pudo leer la base de datos' });
  }

  // Despachador asigna un viaje
  socket.on('trip:assign', async (data: { tripRequestId: number; vehicleId: number }) => {
    try {
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

  // Driver-app reporta posición
  socket.on('vehicle:update', async (data: {
    id: number;
    currentLatitude: number;
    currentLongitude: number;
    status?: string;
  }) => {
    try {
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
