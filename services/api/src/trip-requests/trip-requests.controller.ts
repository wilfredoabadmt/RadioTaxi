import { Controller, Post, Body, Get, Param, ParseIntPipe } from '@nestjs/common';
import { TripRequestsService } from './trip-requests.service';
import { CreateTripRequestDto } from './dto/create-trip-request.dto';

@Controller('trip-requests')
export class TripRequestsController {
  constructor(private readonly service: TripRequestsService) {}

  @Post()
  create(@Body() body: CreateTripRequestDto) {
    return this.service.create(body);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }
}
