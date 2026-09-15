import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCostCenterDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa matriz operadora' })
  @IsNumber()
  @IsNotEmpty()
  companyId!: number;

  @ApiProperty({ example: 'CC-FINANZAS-01', description: 'Código único interno del centro de costo' })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: 'Departamento de Finanzas y Auditoría', description: 'Nombre descriptivo del centro de costo' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'Gastos de movilidad y transporte corporativo para auditorías', description: 'Descripción opcional' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'GERENCIA_ADMINISTRATIVA', description: 'Centro presupuestario superior' })
  @IsString()
  @IsOptional()
  budgetCenter?: string;
}
