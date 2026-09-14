import { Controller, Get, Post, Param, Body, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { CancelTripDto } from './dto/cancel-trip.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('trips')
@ApiBearerAuth('JWT-auth')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar todos los viajes de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de viajes obtenida exitosamente' })
  findAll() {
    return this.tripsService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER', 'USER')
  @ApiOperation({ summary: 'Obtener el detalle de un viaje por su ID' })
  @ApiParam({ name: 'id', description: 'Identificador único del viaje' })
  @ApiResponse({ status: 200, description: 'Detalle del viaje y asignaciones' })
  @ApiResponse({ status: 404, description: 'Viaje no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Trip')
  @ApiOperation({ summary: 'Crear un nuevo viaje y asignar conductor/vehículo' })
  @ApiResponse({ status: 201, description: 'Viaje creado con estado ASSIGNED' })
  @ApiResponse({ status: 409, description: 'Vehículo o conductor ocupados' })
  create(@Body() body: CreateTripDto) {
    return this.tripsService.create(body);
  }

  @Post(':id/arrived')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('ARRIVED', 'Trip')
  @ApiOperation({ summary: 'Transición de estado: Conductor llegó al punto de recogida (ASSIGNED -> ARRIVED)' })
  @ApiParam({ name: 'id', description: 'ID del viaje' })
  markArrived(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.markArrived(id);
  }

  @Post(':id/start')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('START', 'Trip')
  @ApiOperation({ summary: 'Transición de estado: Iniciar viaje con el pasajero a bordo (ARRIVED -> IN_PROGRESS)' })
  @ApiParam({ name: 'id', description: 'ID del viaje' })
  start(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.start(id);
  }

  @Post(':id/complete')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('COMPLETE', 'Trip')
  @ApiOperation({ summary: 'Transición de estado: Finalizar y completar viaje (IN_PROGRESS -> COMPLETED)' })
  @ApiParam({ name: 'id', description: 'ID del viaje' })
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.tripsService.complete(id);
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @Audit('CANCEL', 'Trip')
  @ApiOperation({ summary: 'Transición de estado: Cancelar viaje y liberar recursos' })
  @ApiParam({ name: 'id', description: 'ID del viaje' })
  cancel(@Param('id', ParseIntPipe) id: number, @Body() body: CancelTripDto) {
    return this.tripsService.cancel(id, body.reason);
  }
}