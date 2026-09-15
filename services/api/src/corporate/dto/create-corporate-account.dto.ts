import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCorporateAccountDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa matriz operadora de radiotaxi' })
  @IsNumber()
  @IsNotEmpty()
  companyId!: number;

  @ApiProperty({ example: 'Banco Mercantil Santa Cruz S.A.', description: 'Razón social o nombre de la empresa cliente B2B' })
  @IsString()
  @IsNotEmpty()
  clientCompanyName!: string;

  @ApiPropertyOptional({ example: 'Lic. Mariana Valdez', description: 'Nombre del representante o contacto responsable' })
  @IsString()
  @IsOptional()
  contactName?: string;

  @ApiPropertyOptional({ example: 'mvaldez@bmsc.com.bo', description: 'Correo electrónico para facturación y reportes' })
  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'Crédito a 30 días con factura fiscal', description: 'Términos de crédito o pago' })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiProperty({ example: 10000.0, description: 'Límite de crédito mensual en Bolivianos (BOB)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  creditLimit!: number;
}
