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
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Driver')
  create(@Body() body: CreateDriverDto) {
    return this.driversService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'Driver')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDriverDto) {
    return this.driversService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('DELETE', 'Driver')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }
}
