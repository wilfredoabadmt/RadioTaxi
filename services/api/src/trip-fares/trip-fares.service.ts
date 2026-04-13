import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripFaresService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    const tripFare = await this.prisma.tripFare.create({
      data: {
        tripId: data.tripId,
        pricingRuleId: data.pricingRuleId,
        baseFare: data.baseFare,
        distanceMeters: data.distanceMeters,
        durationSeconds: data.durationSeconds,
        totalFare: data.totalFare,
      } as any,
    });

    await this.prisma.trip.update({
      where: { id: data.tripId },
      data: {
        fareTotal: data.totalFare,
      } as any,
    });

    return tripFare;
  }

  findAll() {
    return this.prisma.tripFare.findMany({
      include: { trip: true, pricingRule: true }
    });
  }

  findOne(id: number) {
    return this.prisma.tripFare.findUnique({
      where: { id },
      include: { trip: true, pricingRule: true }
    });
  }
}
