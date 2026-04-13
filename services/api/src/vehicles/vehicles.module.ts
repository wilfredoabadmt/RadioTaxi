import { Module } from '@nestjs/common';
import { VehiclesService } from './vehicles.service'; // Asegúrate que la V sea mayúscula
import { VehiclesController } from './vehicles.controller';

@Module({
  controllers: [VehiclesController],
  providers: [VehiclesService],
  exports: [VehiclesService],
})
export class VehiclesModule {}