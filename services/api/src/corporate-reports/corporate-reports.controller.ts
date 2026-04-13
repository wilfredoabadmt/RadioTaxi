import { Controller, Get, Param, Post } from '@nestjs/common';
import { CorporateReportsService } from './corporate-reports.service';

@Controller('reports')
export class CorporateReportsController {
  constructor(private service: CorporateReportsService) {}

  @Post(':companyId')
  generate(@Param('companyId') companyId: string) {
    return this.service.generateReport(Number(companyId));
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }
}
