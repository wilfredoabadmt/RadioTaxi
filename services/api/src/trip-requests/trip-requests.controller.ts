import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('trip-requests')
export class TripRequestsController {
  constructor(private prisma: PrismaService) {}

  // 🚀 Crear solicitud de viaje (cliente)
  @Post()
  create(@Body() body: any) {
    return this.prisma.tripRequest.create({
      data: {
        customerId: body.customerId,
        companyId: body.companyId,
        originAddress: body.originAddress,
        originLat: body.originLat,
        originLng: body.originLng,
        destinationAddress: body.destinationAddress,
        destinationLat: body.destinationLat,
        destinationLng: body.destinationLng,
      }
    });
  }

  // 📄 Ver todas las solicitudes
  @Get()
  findAll() {
    return this.prisma.tripRequest.findMany({
      include: {
        customer: true,
        company: true
      }
    });
  }

  // 🔍 Ver una solicitud
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.prisma.tripRequest.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        company: true
      }
    });
  }
}