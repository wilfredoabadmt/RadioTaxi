import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Vehicle')
  create(@Body() body: CreateVehicleDto) {
    return this.vehiclesService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'Vehicle')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateVehicleDto) {
    return this.vehiclesService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('DELETE', 'Vehicle')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
