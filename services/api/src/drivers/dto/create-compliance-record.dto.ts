import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateComplianceRecordDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa de radiotaxi matriz' })
  @IsNumber()
  @IsNotEmpty()
  companyId!: number;

  @ApiPropertyOptional({ example: 'TIC-LP-2026-0941', description: 'Número de Tarjeta de Identificación del Conductor emitida por Tránsito' })
  @IsString()
  @IsOptional()
  ticNumber?: string;

  @ApiPropertyOptional({ example: 'CUDAP-884210', description: 'Código Único de Documento de Antecedentes Policiales' })
  @IsString()
  @IsOptional()
  cudapNumber?: string;

  @ApiPropertyOptional({ example: '4928104018', description: 'NIT tributario individual o de cooperativa' })
  @IsString()
  @IsOptional()
  nit?: string;

  @ApiPropertyOptional({ example: 'REG-SEPREC-2026-LP', description: 'Registro de comercio SEPREC' })
  @IsString()
  @IsOptional()
  commerceRegistry?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Fecha de vencimiento de la acreditación regulatoria' })
  @IsDateString()
  @IsOptional()
  validUntil?: string;

  @ApiPropertyOptional({ example: 'valid', description: 'Estado regulatorio (pending, valid, expired)' })
  @IsString()
  @IsOptional()
  status?: string;
}
