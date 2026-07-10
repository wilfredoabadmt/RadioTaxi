import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MapsService } from './maps.service';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { Roles } from '../auth/roles.decorator';

@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  geocode(@Query('address') address: string) {
    return this.mapsService.geocodeAddress(address);
  }

  @Post('directions')
  @Roles('USER', 'DRIVER', 'DISPATCHER', 'ADMIN')
  calculateRoute(@Body() data: CalculateRouteDto) {
    return this.mapsService.calculateRoute(data.origin, data.destination);
  }
}
