import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';

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
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.findOne(id);
  }

  // 🚕 Crear viaje
  @Post()
  create(@Body() body: CreateTripDto) {
    return this.tripsService.create(body);
  }
}