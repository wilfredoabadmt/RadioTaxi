import { Controller, Get, Param, Post } from '@nestjs/common';
import { CorporateReportsService } from './corporate-reports.service';
import { Roles } from '../auth/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';

@Controller('reports')
export class CorporateReportsController {
  constructor(private service: CorporateReportsService) {}

  // 📊 Generar reporte
  @Post(':companyId')
  @Roles('ADMIN', 'DISPATCHER')
  @Audit('GENERATE', 'CorporateReport')
  generate(@Param('companyId') companyId: string) {
    return this.service.generateReport(Number(companyId));
  }

  // 📄 Listar reportes
  @Get()
  @Roles('ADMIN', 'DISPATCHER')
  findAll() {
    return this.service.findAll();
  }
}