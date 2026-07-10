import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
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
}