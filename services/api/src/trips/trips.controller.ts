import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  // 📄 Obtener todos los viajes
  @Get()
  findAll() {
    return this.tripsService.findAll();
  }

  // 🔍 Obtener un viaje por ID
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tripsService.findOne(Number(id));
  }

  // 🚕 Crear viaje
  @Post()
  create(@Body() body: any) {
    return this.tripsService.create(body);
  }
}