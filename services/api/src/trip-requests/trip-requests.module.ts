import { Module } from '@nestjs/common';
import { TripRequestsController } from './trip-requests.controller';
import { TripRequestsService } from './trip-requests.service';
import { PrismaService } from '../prisma/prisma.service'; // Aún necesario para el servicio

@Module({
  controllers: [TripRequestsController],
  providers: [TripRequestsService, PrismaService],
  exports: [TripRequestsService] // Exportamos por si otros módulos lo necesitan
})
export class TripRequestsModule {}