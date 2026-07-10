import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

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

    const trip = await this.prisma.trip.create({
      data: {
        tripRequestId: data.tripRequestId,
        driverId: driver.id,
        vehicleId: vehicle.id,
      }
    });

    await this.prisma.tripRequest.update({
      where: { id: data.tripRequestId },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    });

    return trip;
  }
}