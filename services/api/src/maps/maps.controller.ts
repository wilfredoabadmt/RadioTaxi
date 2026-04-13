import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { MapsService } from './maps.service';
import { CalculateRouteDto } from './dto/calculate-route.dto';

@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('geocode')
  geocode(@Query('address') address: string) {
    return this.mapsService.geocodeAddress(address);
  }

  @Post('directions')
  calculateRoute(@Body() data: CalculateRouteDto) {
    return this.mapsService.calculateRoute(data.origin, data.destination);
  }
}
