import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';

@Injectable()
export class TripRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Crea una nueva solicitud de viaje.
   * El customerId proviene del usuario autenticado (controlador).
   */
  create(data: CreateTripRequestDto, customerId: number) {
    return this.prisma.tripRequest.create({
      data: {
        customerId: customerId, // Ahora viene del usuario autenticado
        companyId: data.companyId,
        originAddress: data.originAddress,
        originLat: data.originLat,
        originLng: data.originLng,
        destinationAddress: data.destinationAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null
      },
      include: { company: true, driver: true, customer: true } // Incluimos customer
    });
  }

  /**
   * Obtiene todas las solicitudes de viaje, o solo las del usuario si es un CLIENTE.
   * Los roles ADMIN y DISPATCHER pueden ver todas.
   */
  findAll(userRole: string, userId: number) {
    const where = userRole === 'USER' ? { customerId: userId } : {};
    return this.prisma.tripRequest.findMany({
      where,
      include: { company: true, driver: true, customer: true },
      orderBy: { requestedAt: 'desc' }
    });
  }

  /**
   * Obtiene una única solicitud de viaje, respetando el scope del usuario.
   */
  async findOne(id: number, userRole: string, userId: number) {
    const where: any = { id };
    if (userRole === 'USER') {
      where.customerId = userId;
    }

    // findFirst (no findUnique): el where puede incluir customerId, que no es
    // un campo único y findUnique rechazaría.
    const request = await this.prisma.tripRequest.findFirst({
      where,
      include: { company: true, driver: true, customer: true }
    });

    if (!request) {
      throw new NotFoundException(`TripRequest con ID ${id} no encontrada o no pertenece al usuario.`);
    }
    return request;
  }

  /**
   * Obtiene todas las solicitudes de viaje de un cliente específico (para el rol USER).
   */
  findMine(customerId: number) {
    return this.prisma.tripRequest.findMany({
      where: { customerId },
      include: { company: true, driver: true, customer: true },
      orderBy: { requestedAt: 'desc' }
    });
  }

  /**
   * Cancela una solicitud (PENDING|ACCEPTED → CANCELLED). Puede hacerlo el
   * pasajero dueño o el despacho (ADMIN/DISPATCHER). Si ya existe un viaje
   * asociado no terminal, también se cancela y se liberan conductor/vehículo.
   */
  async cancel(id: number, userRole: string, userId: number, reason?: string) {
    const where: any = { id };
    if (userRole === 'USER') {
      where.customerId = userId;
    }

    const request = await this.prisma.tripRequest.findFirst({
      where,
      include: { trip: true },
    });

    if (!request) {
      throw new NotFoundException(
        `TripRequest con ID ${id} no encontrada o no pertenece al usuario.`,
      );
    }

    if (request.status !== 'PENDING' && request.status !== 'ACCEPTED') {
      throw new ConflictException(
        `No se puede cancelar una solicitud en estado "${request.status}"`,
      );
    }

    const ops: any[] = [
      this.prisma.tripRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      }),
    ];

    // Si hay un viaje asociado no terminal, cancelarlo y liberar recursos.
    const trip = request.trip;
    if (trip && trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED') {
      ops.push(
        this.prisma.trip.update({
          where: { id: trip.id },
          data: { status: 'CANCELLED', endedAt: new Date() },
        }),
        this.prisma.driver.update({
          where: { id: trip.driverId },
          data: { status: 'available' },
        }),
        this.prisma.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'available' },
        }),
      );
    }

    const [updatedRequest] = await this.prisma.$transaction(ops);
    return { ...updatedRequest, cancellationReason: reason ?? null };
  }
}
