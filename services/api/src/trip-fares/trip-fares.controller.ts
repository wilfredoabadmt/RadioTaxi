import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TripFaresService } from './trip-fares.service';
import { CreateTripFareDto } from './dto/create-trip-fare.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('trip-fares')
export class TripFaresController {
  constructor(private readonly tripFaresService: TripFaresService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  findAll() {
    return this.tripFaresService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripFaresService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'TripFare')
  create(@Body() data: CreateTripFareDto) {
    return this.tripFaresService.create(data);
  }
}
