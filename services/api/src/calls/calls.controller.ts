import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CallsService } from './calls.service';
import { CreateCallEventDto } from './dto/create-call-event.dto';
import { CreateTripFromCallDto } from './dto/create-trip-from-call.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('calls')
@ApiBearerAuth('JWT-auth')
@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Post('events')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('REGISTER_CALL_EVENT', 'CallRecord')
  @ApiOperation({ summary: 'Registrar evento de ciclo de vida de llamada (RINGING, ANSWERED, ENDED)' })
  @ApiResponse({ status: 201, description: 'Evento procesado y perfil de cliente resuelto' })
  registerEvent(@Body() dto: CreateCallEventDto) {
    return this.callsService.registerCallEvent(dto);
  }

  @Get('profile/:phoneNumber')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Obtener perfil enriquecido de cliente llamante con direcciones frecuentes' })
  @ApiParam({ name: 'phoneNumber', description: 'Número telefónico en formato internacional o local' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa (default 1)' })
  @ApiResponse({ status: 200, description: 'Perfil de cliente, viajes acumulados y direcciones habituales' })
  getCallerProfile(
    @Param('phoneNumber') phoneNumber: string,
    @Query('companyId') companyId?: string,
  ) {
    const compId = companyId ? parseInt(companyId, 10) : 1;
    return this.callsService.getCallerProfile(compId, phoneNumber);
  }

  @Post(':callUuid/trip')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE_TRIP_FROM_CALL', 'TripRequest')
  @ApiOperation({ summary: 'Despacho en 1-Clic: convertir llamada en solicitud de viaje TripRequest' })
  @ApiParam({ name: 'callUuid', description: 'UUID único de la llamada Asterisk' })
  @ApiResponse({ status: 201, description: 'Solicitud de viaje creada y vinculada a la llamada' })
  @ApiResponse({ status: 404, description: 'Llamada no encontrada' })
  createTripFromCall(
    @Param('callUuid') callUuid: string,
    @Body() dto: CreateTripFromCallDto,
    @Req() req: any,
  ) {
    const dispatcherId = req.user?.id;
    return this.callsService.createTripFromCall(callUuid, dto, dispatcherId);
  }

  @Get('history')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Historial de llamadas telefónicas recibidas en la central' })
  @ApiQuery({ name: 'companyId', required: false, description: 'Filtrar por empresa' })
  @ApiQuery({ name: 'limit', required: false, description: 'Límite de resultados (default 50)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Desplazamiento de paginación' })
  @ApiResponse({ status: 200, description: 'Listado de llamadas con duración, grabaciones y cliente' })
  getCallHistory(
    @Query('companyId') companyId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const compId = companyId ? parseInt(companyId, 10) : 1;
    const lim = limit ? parseInt(limit, 10) : 50;
    const off = offset ? parseInt(offset, 10) : 0;
    return this.callsService.getCallHistory(compId, lim, off);
  }
}
