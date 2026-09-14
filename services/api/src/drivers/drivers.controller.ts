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
import { DriversService } from './drivers.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('drivers')
@ApiBearerAuth('JWT-auth')
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar todos los conductores de la flota' })
  @ApiResponse({ status: 200, description: 'Lista de conductores' })
  findAll() {
    return this.driversService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN', 'DISPATCHER', 'DRIVER')
  @ApiOperation({ summary: 'Obtener datos de un conductor por ID' })
  @ApiParam({ name: 'id', description: 'ID del conductor' })
  @ApiResponse({ status: 200, description: 'Detalle del conductor' })
  @ApiResponse({ status: 404, description: 'Conductor no encontrado' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'Driver')
  @ApiOperation({ summary: 'Registrar un nuevo conductor (crea usuario y perfil transaccionalmente)' })
  @ApiResponse({ status: 201, description: 'Conductor registrado' })
  @ApiResponse({ status: 409, description: 'El correo electrónico ya existe' })
  create(@Body() body: CreateDriverDto) {
    return this.driversService.create(body);
  }

  @Patch(':id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'Driver')
  @ApiOperation({ summary: 'Actualizar información o estado del conductor (available/busy/offline)' })
  @ApiParam({ name: 'id', description: 'ID del conductor' })
  @ApiResponse({ status: 200, description: 'Conductor actualizado' })
  update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateDriverDto) {
    return this.driversService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Audit('DELETE', 'Driver')
  @ApiOperation({ summary: 'Eliminar conductor (baja lógica si no tiene viajes)' })
  @ApiParam({ name: 'id', description: 'ID del conductor' })
  @ApiResponse({ status: 200, description: 'Conductor eliminado' })
  @ApiResponse({ status: 409, description: 'No se puede eliminar porque tiene viajes asociados' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.driversService.remove(id);
  }
}
