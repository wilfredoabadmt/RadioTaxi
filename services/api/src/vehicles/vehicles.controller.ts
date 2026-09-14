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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('vehicles')
@ApiBearerAuth('JWT-auth')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar todos los vehículos de la flota' })
  @ApiResponse({ status: 200, description: 'Lista de vehículos' })
  findAll() {
    return this.vehiclesService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @ApiOperation({ summary: 'Obtener información de un vehículo por ID' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Datos del vehículo' })
  @ApiResponse({ status: 404, description: 'Vehículo no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Vehicle')
  @ApiOperation({ summary: 'Registrar un nuevo vehículo en la flota' })
  @ApiResponse({ status: 201, description: 'Vehículo registrado' })
  @ApiResponse({ status: 409, description: 'La placa ya se encuentra registrada' })
  create(@Body() body: CreateVehicleDto) {
    return this.vehiclesService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'Vehicle')
  @ApiOperation({ summary: 'Actualizar datos o estado de un vehículo' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo actualizado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateVehicleDto) {
    return this.vehiclesService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('DELETE', 'Vehicle')
  @ApiOperation({ summary: 'Eliminar vehículo (solo si no tiene viajes asociados)' })
  @ApiParam({ name: 'id', description: 'ID del vehículo' })
  @ApiResponse({ status: 200, description: 'Vehículo eliminado' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar porque tiene viajes asociados' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.vehiclesService.remove(id);
  }
}
