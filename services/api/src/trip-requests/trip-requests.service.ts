import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';

@Injectable()
export class TripRequestsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.tripRequest.findMany({
      include: { company: true, driver: true }
    });
  }

  findOne(id: number) {
    return this.prisma.tripRequest.findUnique({
      where: { id },
      include: { company: true, driver: true }
    });
  }

  create(data: CreateTripRequestDto) {
    return this.prisma.tripRequest.create({
      data: {
        customerId: data.customerId,
        companyId: data.companyId,
        originAddress: data.originAddress,
        originLat: data.originLat,
        originLng: data.originLng,
        destinationAddress: data.destinationAddress,
        destinationLat: data.destinationLat,
        destinationLng: data.destinationLng,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null
      },
      include: { company: true, driver: true }
    });
  }
}
