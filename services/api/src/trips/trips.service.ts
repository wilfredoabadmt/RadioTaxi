import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async create(data: any) {
    const tripRequest = await this.prisma.tripRequest.findUnique({
      where: { id: data.tripRequestId }
    });

    if (!tripRequest) {
      throw new Error('TripRequest not found');
    }

    const existingTrip = await this.prisma.trip.findUnique({
      where: { tripRequestId: data.tripRequestId }
    });

    if (existingTrip) {
      throw new Error('Trip already exists for this request');
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
      throw new Error('Driver or Vehicle not available');
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
