import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { Roles } from '../auth/roles.decorator';

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

  @Get('geofences')
  @Roles('DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Obtener geocercas configuradas por empresa' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa' })
  @ApiResponse({ status: 200, description: 'Lista de geocercas' })
  findGeofences(@Query('companyId') companyId?: string) {
    return this.pricingService.findGeofences(companyId ? Number(companyId) : undefined);
  }

  @Post('calculate')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  @ApiOperation({ summary: 'Calcular estimación o tarifa de viaje según distancia, tiempo y geocercas' })
  @ApiResponse({ status: 200, description: 'Desglose detallado de la tarifa' })
  calculateFare(@Body() data: CalculateFareDto) {
    return this.pricingService.calculateFare(data);
  }
}
