import { Module } from '@nestjs/common';
import { TripFaresService } from './trip-fares.service';
import { TripFaresController } from './trip-fares.controller';

@Module({
  controllers: [TripFaresController],
  providers: [TripFaresService]
})
export class TripFaresModule {}
