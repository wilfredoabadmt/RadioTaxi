import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { CorporateReportsService } from './corporate-reports.service';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@ApiTags('reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class CorporateReportsController {
  constructor(private service: CorporateReportsService) {}

  @Post(':companyId')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('GENERATE', 'CorporateReport')
  @ApiOperation({ summary: 'Generar reporte consolidado de viajes y facturación para una empresa' })
  @ApiParam({ name: 'companyId', description: 'ID de la empresa cliente o radiotaxi' })
  @ApiResponse({ status: 201, description: 'Reporte generado con métricas' })
  generate(@Param('companyId') companyId: string) {
    return this.service.generateReport(Number(companyId));
  }

  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  @ApiOperation({ summary: 'Listar reportes generados' })
  @ApiResponse({ status: 200, description: 'Historial de reportes' })
  findAll() {
    return this.service.findAll();
  }
}