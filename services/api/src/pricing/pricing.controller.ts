import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  @Roles('DISPATCHER', 'ADMIN')
  findRules(@Query('companyId') companyId?: string) {
    return this.pricingService.findRules(companyId ? Number(companyId) : undefined);
  }

  @Get('geofences')
  @Roles('DISPATCHER', 'ADMIN')
  findGeofences(@Query('companyId') companyId?: string) {
    return this.pricingService.findGeofences(companyId ? Number(companyId) : undefined);
  }

  @Post('calculate')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  calculateFare(@Body() data: CalculateFareDto) {
    return this.pricingService.calculateFare(data);
  }
}
