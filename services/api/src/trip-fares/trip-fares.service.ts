import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripFareDto } from './dto/create-trip-fare.dto';

@Injectable()
export class TripFaresService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTripFareDto) {
    const tripFare = await this.prisma.tripFare.create({
      data: {
        tripId: data.tripId,
        pricingRuleId: data.pricingRuleId,
        baseFare: data.baseFare,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        totalFare: data.totalFare,
      },
    });

    // Actualizamos el total en la tabla de viajes
    await this.prisma.trip.update({
      where: { id: data.tripId },
      data: {
        fareTotal: data.totalFare,
      },
    });

    return tripFare;
  }

  findAll() {
    return this.prisma.tripFare.findMany({
      include: { trip: true, pricingRule: true }
    });
  }

  // --- ESTO ES LO QUE EL CONTROLLER ESTÁ PIDIENDO ---
  findOne(id: number) {
    return this.prisma.tripFare.findUnique({
      where: { id },
      include: { trip: true, pricingRule: true }
    });
  }
}