import { Module } from '@nestjs/common';
import { TripRequestsController } from './trip-requests.controller';
import { TripRequestsService } from './trip-requests.service';

@Module({
  controllers: [TripRequestsController],
  providers: [TripRequestsService],
  exports: [TripRequestsService]
})
export class TripRequestsModule {}
