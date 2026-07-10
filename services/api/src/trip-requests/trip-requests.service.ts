import { Injectable, NotFoundException } from '@nestjs/common';
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
}
