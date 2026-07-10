import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

// Estados del viaje: ASSIGNED → ARRIVED → IN_PROGRESS → COMPLETED
// CANCELLED es alcanzable desde cualquier estado no terminal.
export type TripStatus =
  | 'ASSIGNED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

// Máquina de estados: transiciones legales por estado de origen.
const TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  ASSIGNED: ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  private assertTransition(from: string, to: TripStatus) {
    const allowed = TRIP_TRANSITIONS[from as TripStatus] ?? [];
    if (!allowed.includes(to)) {
      throw new ConflictException(
        `Transición inválida: no se puede pasar de "${from}" a "${to}"`,
      );
    }
  }

  private async getTripOrFail(id: number) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) {
      throw new NotFoundException(`Viaje con ID ${id} no encontrado`);
    }
    return trip;
  }

  findAll() {
    return this.prisma.trip.findMany({
      include: {
        driver: {
          include: {
            user: true,
            vehicle: true
          }
        },
        vehicle: true,
        tripRequest: {
          include: {
            company: true,
            customer: true
          }
        }
      }
    });
  }

  findOne(id: number) {
    return this.prisma.trip.findUnique({
      where: { id },
      include: {
        driver: {
          include: {
            user: true,
            vehicle: true
          }
        },
        vehicle: true,
        tripRequest: {
          include: {
            company: true,
            customer: true
          }
        }
      }
    });
  }

  async create(data: CreateTripDto) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: data.tripRequestId }
    });

    if (!tripRequest) {
      throw new NotFoundException(`TripRequest con ID ${data.tripRequestId} no encontrada`);
    }

    const existingTrip = await this.prisma.trip.findUnique({
      where: { tripRequestId: data.tripRequestId }
    });

    if (existingTrip) {
      throw new ConflictException('Ya existe un viaje para esta solicitud');
    }

    const driver = await this.prisma.driver.findFirst({
      where: {
        id: data.driverId
      },
      include: {
        vehicle: true
      }
    });

    if (!driver || driver.vehicle.length === 0) {
      throw new BadRequestException('Conductor o vehículo no disponible');
    }

    const vehicle = driver.vehicle[0];

    // Asignación atómica: crear viaje, aceptar solicitud y ocupar recursos.
    const [trip] = await this.prisma.$transaction([
      this.prisma.trip.create({
        data: {
          tripRequestId: data.tripRequestId,
          driverId: driver.id,
          vehicleId: vehicle.id,
        },
      }),
      this.prisma.tripRequest.update({
        where: { id: data.tripRequestId },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      this.prisma.driver.update({
        where: { id: driver.id },
        data: { status: 'busy' },
      }),
      this.prisma.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'busy' },
      }),
    ]);

    return trip;
  }

  // 🚗 Conductor llegó al punto de recogida: ASSIGNED → ARRIVED
  async markArrived(id: number) {
    const trip = await this.getTripOrFail(id);
    this.assertTransition(trip.status, 'ARRIVED');
    return this.prisma.trip.update({
      where: { id },
      data: { status: 'ARRIVED' },
    });
  }

  // ▶️ Inicio del viaje (pasajero a bordo): ASSIGNED|ARRIVED → IN_PROGRESS
  async start(id: number) {
    const trip = await this.getTripOrFail(id);
    this.assertTransition(trip.status, 'IN_PROGRESS');
    return this.prisma.trip.update({
      where: { id },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });
  }

  // ✅ Fin del viaje: IN_PROGRESS → COMPLETED. Libera recursos.
  async complete(id: number) {
    const trip = await this.getTripOrFail(id);
    this.assertTransition(trip.status, 'COMPLETED');

    const [updated] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id },
        data: { status: 'COMPLETED', endedAt: new Date() },
      }),
      this.prisma.tripRequest.update({
        where: { id: trip.tripRequestId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      }),
      this.prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' },
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' },
      }),
    ]);

    return updated;
  }

  // ✖️ Cancelación: ASSIGNED|ARRIVED|IN_PROGRESS → CANCELLED. Libera recursos.
  async cancel(id: number, reason?: string) {
    const trip = await this.getTripOrFail(id);
    this.assertTransition(trip.status, 'CANCELLED');

    const [updated] = await this.prisma.$transaction([
      this.prisma.trip.update({
        where: { id },
        data: { status: 'CANCELLED', endedAt: new Date() },
      }),
      this.prisma.tripRequest.update({
        where: { id: trip.tripRequestId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.driver.update({
        where: { id: trip.driverId },
        data: { status: 'available' },
      }),
      this.prisma.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: 'available' },
      }),
    ]);

    // El motivo se conserva en el AuditLog (interceptor) vía la respuesta.
    return { ...updated, cancellationReason: reason ?? null };
  }
}