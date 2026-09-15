import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { CreatePricingRuleDto } from './dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from './dto/update-pricing-rule.dto';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { UpdateGeofenceDto } from './dto/update-geofence.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('pricing')
@ApiBearerAuth('JWT-auth')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener reglas de tarificación activas por empresa' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de reglas de tarifas' })
  findRules(@Query('companyId') companyId?: string) {
    return this.pricingService.findRules(companyId ? Number(companyId) : undefined);
  }

  @Get('rules/:id')
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener detalle de una regla de tarificación' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({ status: 200, description: 'Detalle de la regla' })
  @ApiResponse({ status: 404, description: 'Regla no encontrada' })
  findOneRule(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.findOneRule(id);
  }

  @Post('rules')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'PricingRule')
  @ApiOperation({ summary: 'Crear una nueva regla de tarificación' })
  @ApiResponse({ status: 201, description: 'Regla creada exitosamente' })
  createRule(@Body() dto: CreatePricingRuleDto) {
    return this.pricingService.createRule(dto);
  }

  @Patch('rules/:id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'PricingRule')
  @ApiOperation({ summary: 'Actualizar una regla de tarificación' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({ status: 200, description: 'Regla actualizada exitosamente' })
  updateRule(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePricingRuleDto) {
    return this.pricingService.updateRule(id, dto);
  }

  @Delete('rules/:id')
  @Roles('ADMIN')
  @Audit('DELETE', 'PricingRule')
  @ApiOperation({ summary: 'Eliminar o desactivar regla de tarificación' })
  @ApiParam({ name: 'id', description: 'ID de la regla' })
  @ApiResponse({ status: 200, description: 'Regla eliminada o desactivada' })
  deleteRule(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.deleteRule(id);
  }

  @Get('geofences')
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener geocercas configuradas por empresa' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de geocercas' })
  findGeofences(@Query('companyId') companyId?: string) {
    return this.pricingService.findGeofences(companyId ? Number(companyId) : undefined);
  }

  @Get('geofences/:id')
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener detalle de una geocerca' })
  @ApiParam({ name: 'id', description: 'ID de la geocerca' })
  @ApiResponse({ status: 200, description: 'Detalle de la geocerca' })
  @ApiResponse({ status: 404, description: 'Geocerca no encontrada' })
  findOneGeofence(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.findOneGeofence(id);
  }

  @Post('geofences')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Geofence')
  @ApiOperation({ summary: 'Registrar una nueva geocerca perimetral' })
  @ApiResponse({ status: 201, description: 'Geocerca registrada exitosamente' })
  createGeofence(@Body() dto: CreateGeofenceDto) {
    return this.pricingService.createGeofence(dto);
  }

  @Patch('geofences/:id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'Geofence')
  @ApiOperation({ summary: 'Actualizar una geocerca perimetral' })
  @ApiParam({ name: 'id', description: 'ID de la geocerca' })
  @ApiResponse({ status: 200, description: 'Geocerca actualizada' })
  updateGeofence(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateGeofenceDto) {
    return this.pricingService.updateGeofence(id, dto);
  }

  @Delete('geofences/:id')
  @Roles('ADMIN')
  @Audit('DELETE', 'Geofence')
  @ApiOperation({ summary: 'Eliminar una geocerca' })
  @ApiParam({ name: 'id', description: 'ID de la geocerca' })
  @ApiResponse({ status: 200, description: 'Geocerca eliminada' })
  deleteGeofence(@Param('id', ParseIntPipe) id: number) {
    return this.pricingService.deleteGeofence(id);
  }

  @Post('calculate')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Calcular estimación o tarifa de viaje según distancia, tiempo y geocercas' })
  @ApiResponse({ status: 200, description: 'Desglose detallado de la tarifa' })
  calculateFare(@Body() data: CalculateFareDto) {
    return this.pricingService.calculateFare(data);
  }
}
