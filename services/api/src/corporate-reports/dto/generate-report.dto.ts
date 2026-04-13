import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export enum ReportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  SAP = 'sap'
}

export class GenerateReportDto {
  @IsInt()
  companyId!: number;

  @IsNotEmpty()
  reportType!: string;

  @IsEnum(ReportFormat)
  format!: ReportFormat;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsNotEmpty()
  costCenterId?: string;
}
