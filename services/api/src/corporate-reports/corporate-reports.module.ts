import { Module } from '@nestjs/common';
import { CorporateReportsService } from './corporate-reports.service';
import { CorporateReportsController } from './corporate-reports.controller';

@Module({
  providers: [CorporateReportsService],
  controllers: [CorporateReportsController],
  exports: [CorporateReportsService]
})
export class CorporateReportsModule {}
