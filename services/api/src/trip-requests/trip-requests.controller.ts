import { Controller, Post, Body, Get, Param, ParseIntPipe, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { TripRequestsService } from './trip-requests.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';
import { CancelTripRequestDto } from './dto/cancel-trip-request.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('trip-requests')
@ApiBearerAuth('JWT-auth')
@Controller('trip-requests')
export class TripRequestsController {
  constructor(private readonly tripRequestsService: TripRequestsService) {}

  @Roles('USER')
  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de viaje (Pasajero)' })
  @ApiResponse({ status: 201, description: 'Solicitud creada con estado PENDING' })
  create(@Body() createTripRequestDto: CreateTripRequestDto, @Request() req: any) {
    return this.tripRequestsService.create(createTripRequestDto, req.user.id);
  }

  @Roles('ADMIN', 'DISPATCHER')
  @Get()
  @ApiOperation({ summary: 'Listar todas las solicitudes de viaje pendientes y activas' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes' })
  findAll(@Request() req: any) {
    return this.tripRequestsService.findAll(req.user.role, req.user.id);
  }

  @Roles('USER')
  @Get('mine')
  @ApiOperation({ summary: 'Listar el historial de solicitudes del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Lista de solicitudes propias' })
  findMine(@Request() req: any) {
    return this.tripRequestsService.findMine(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener el detalle de una solicitud de viaje' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  @ApiResponse({ status: 200, description: 'Detalle de la solicitud' })
  @ApiResponse({ status: 404, description: 'Solicitud no encontrada' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.tripRequestsService.findOne(Number(id), req.user.role, req.user.id);
  }

  @Roles('USER', 'ADMIN', 'DISPATCHER')
  @Post(':id/cancel')
  @Audit('CANCEL', 'TripRequest')
  @ApiOperation({ summary: 'Cancelar una solicitud de viaje pendiente o aceptada' })
  @ApiParam({ name: 'id', description: 'ID de la solicitud' })
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CancelTripRequestDto,
    @Request() req: any,
  ) {
    return this.tripRequestsService.cancel(id, req.user.role, req.user.id, body.reason);
  }
}