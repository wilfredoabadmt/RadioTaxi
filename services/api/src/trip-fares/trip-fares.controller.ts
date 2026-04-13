import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { TripFaresService } from './trip-fares.service';
import { CreateTripFareDto } from './dto/create-trip-fare.dto';

@Controller('trip-fares')
export class TripFaresController {
  constructor(private readonly tripFaresService: TripFaresService) {}

  @Get()
  findAll() {
    return this.tripFaresService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tripFaresService.findOne(id);
  }

  @Post()
  create(@Body() data: CreateTripFareDto) {
    return this.tripFaresService.create(data);
  }
}
