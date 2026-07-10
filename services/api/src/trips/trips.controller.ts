import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // 📄 Obtener todos los viajes
  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  findAll() {
    return this.tripsService.findAll();
  }

  // 🔍 Obtener un viaje por ID
  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER', 'USER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.findOne(id);
  }

  // 🚕 Crear viaje
  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Trip')
  create(@Body() body: CreateTripDto) {
    return this.tripsService.create(body);
  }

  // 🚗 Conductor llegó al punto de recogida: ASSIGNED → ARRIVED
  @Post(':id/arrived')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('ARRIVED', 'Trip')
  markArrived(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.markArrived(id);
  }

  // ▶️ Iniciar viaje: ASSIGNED|ARRIVED → IN_PROGRESS
  @Post(':id/start')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('START', 'Trip')
  start(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.start(id);
  }

  // ✅ Completar viaje: IN_PROGRESS → COMPLETED
  @Post(':id/complete')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('COMPLETE', 'Trip')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.complete(id);
  }

  // ✖️ Cancelar viaje (con motivo): → CANCELLED
  @Post(':id/cancel')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('CANCEL', 'Trip')
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body: CancelTripDto) {
    return this.tripsService.cancel(id, body.reason);
  }
}