import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CalculateFareDto } from './dto/calculate-fare.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('rules')
  findRules(@Query('companyId') companyId?: string) {
    return this.pricingService.findRules(companyId ? Number(companyId) : undefined);
  }

  @Get('geofences')
  findGeofences(@Query('companyId') companyId?: string) {
    return this.pricingService.findGeofences(companyId ? Number(companyId) : undefined);
  }

  @Post('calculate')
  calculateFare(@Body() data: CalculateFareDto) {
    return this.pricingService.calculateFare(data);
  }
}
