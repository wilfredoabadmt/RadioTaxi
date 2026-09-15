import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CorporateService } from './corporate.service';
import { CreateCorporateAccountDto } from './dto/create-corporate-account.dto';
import { UpdateCorporateAccountDto } from './dto/update-corporate-account.dto';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { CreateCorporateReservationDto } from './dto/create-corporate-reservation.dto';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('corporate')
@ApiBearerAuth('JWT-auth')
@Controller('corporate')
export class CorporateController {
  constructor(private readonly corporateService: CorporateService) {}

  // ---------------------------------------------------------------------------
  // Cuentas Corporativas B2B
  // ---------------------------------------------------------------------------

  @Get('accounts')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar empresas clientes corporativas B2B con saldos de crédito' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa matriz' })
  @ApiResponse({ status: 200, description: 'Lista de cuentas B2B' })
  findAllAccounts(@Query('companyId') companyId?: string) {
    return this.corporateService.findAllAccounts(companyId ? Number(companyId) : undefined);
  }

  @Get('accounts/:id')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Obtener detalle de una cuenta corporativa y su historial' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta corporativa' })
  @ApiResponse({ status: 200, description: 'Detalle de la cuenta' })
  findOneAccount(@Param('id', ParseIntPipe) id: number) {
    return this.corporateService.findOneAccount(id);
  }

  @Post('accounts')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'CorporateAccount')
  @ApiOperation({ summary: 'Registrar una nueva empresa cliente corporativa B2B' })
  @ApiResponse({ status: 201, description: 'Cuenta corporativa creada' })
  createAccount(@Body() dto: CreateCorporateAccountDto) {
    return this.corporateService.createAccount(dto);
  }

  @Patch('accounts/:id')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'CorporateAccount')
  @ApiOperation({ summary: 'Actualizar límites de crédito o datos de cuenta B2B' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta corporativa' })
  @ApiResponse({ status: 200, description: 'Cuenta corporativa actualizada' })
  updateAccount(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCorporateAccountDto) {
    return this.corporateService.updateAccount(id, dto);
  }

  @Delete('accounts/:id')
  @Roles('ADMIN')
  @Audit('DELETE', 'CorporateAccount')
  @ApiOperation({ summary: 'Eliminar cuenta corporativa (solo sin reservas activas)' })
  @ApiParam({ name: 'id', description: 'ID de la cuenta corporativa' })
  @ApiResponse({ status: 200, description: 'Cuenta eliminada' })
  removeAccount(@Param('id', ParseIntPipe) id: number) {
    return this.corporateService.removeAccount(id);
  }

  // ---------------------------------------------------------------------------
  // Centros de Costo
  // ---------------------------------------------------------------------------

  @Get('cost-centers')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar centros de costo departamentales' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID de la empresa matriz' })
  @ApiResponse({ status: 200, description: 'Lista de centros de costo' })
  findAllCostCenters(@Query('companyId') companyId?: string) {
    return this.corporateService.findAllCostCenters(companyId ? Number(companyId) : undefined);
  }

  @Post('cost-centers')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'CostCenter')
  @ApiOperation({ summary: 'Crear nuevo centro de costo' })
  @ApiResponse({ status: 201, description: 'Centro de costo registrado' })
  createCostCenter(@Body() dto: CreateCostCenterDto) {
    return this.corporateService.createCostCenter(dto);
  }

  @Delete('cost-centers/:id')
  @Roles('ADMIN')
  @Audit('DELETE', 'CostCenter')
  @ApiOperation({ summary: 'Eliminar centro de costo' })
  @ApiParam({ name: 'id', description: 'ID del centro de costo' })
  @ApiResponse({ status: 200, description: 'Centro de costo eliminado' })
  removeCostCenter(@Param('id', ParseIntPipe) id: number) {
    return this.corporateService.removeCostCenter(id);
  }

  // ---------------------------------------------------------------------------
  // Reservas Corporativas Programadas
  // ---------------------------------------------------------------------------

  @Get('reservations')
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar reservas de viajes corporativos programados' })
  @ApiQuery({ name: 'corporateAccountId', required: false, description: 'Filtrar por cuenta B2B' })
  @ApiResponse({ status: 200, description: 'Lista de reservas corporativas' })
  findAllReservations(@Query('corporateAccountId') corporateAccountId?: string) {
    return this.corporateService.findAllReservations(corporateAccountId ? Number(corporateAccountId) : undefined);
  }

  @Post('reservations')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('CREATE', 'CorporateReservation')
  @ApiOperation({ summary: 'Programar una nueva reserva corporativa vinculada a centro de costo' })
  @ApiResponse({ status: 201, description: 'Reserva programada exitosamente' })
  createReservation(@Body() dto: CreateCorporateReservationDto) {
    return this.corporateService.createReservation(dto);
  }

  @Patch('reservations/:id/status')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('UPDATE', 'CorporateReservation')
  @ApiOperation({ summary: 'Actualizar estado de una reserva corporativa' })
  @ApiParam({ name: 'id', description: 'ID de la reserva' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  updateReservationStatus(@Param('id', ParseIntPipe) id: number, @Body('status') status: string) {
    return this.corporateService.updateReservationStatus(id, status);
  }
}
