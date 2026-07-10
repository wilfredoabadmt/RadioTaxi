import { Controller, Post, Body, Get, Param, Request } from '@nestjs/common';
import { TripRequestsService } from './trip-requests.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('trip-requests')
export class TripRequestsController {
  constructor(private readonly tripRequestsService: TripRequestsService) {}

  // 🚀 Crear solicitud de viaje (cliente)
  @Roles('USER')
  @Post()
  create(@Body() createTripRequestDto: CreateTripRequestDto, @Request() req: any) {
    return this.tripRequestsService.create(createTripRequestDto, req.user.id);
  }

  // 📄 Ver todas las solicitudes (solo ADMIN/DISPATCHER)
  @Roles('ADMIN', 'DISPATCHER')
  @Get()
  findAll(@Request() req: any) {
    return this.tripRequestsService.findAll(req.user.role, req.user.id);
  }

  // 🧑‍💻 Ver MIS solicitudes (solo USER)
  // IMPORTANTE: debe declararse ANTES de @Get(':id') para que la ruta estática
  // 'mine' no sea capturada por el parámetro dinámico ':id'.
  @Roles('USER')
  @Get('mine')
  findMine(@Request() req: any) {
    return this.tripRequestsService.findMine(req.user.id);
  }

  // 🔍 Ver una solicitud (según rol)
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.tripRequestsService.findOne(Number(id), req.user.role, req.user.id);
  }
}