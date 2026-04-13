import { Module } from '@nestjs/common';
import { TripRequestsController } from './trip-requests.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [TripRequestsController],
  providers: [PrismaService],
})
export class TripRequestsModule {}