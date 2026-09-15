import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFiscalInvoiceDto {
  @ApiProperty({ description: 'ID del viaje a facturar', example: 12 })
  @IsNumber()
  tripId!: number;

  @ApiProperty({ description: 'NIT o Carnet de Identidad (CI) del cliente', example: '1028374029' })
  @IsString()
  @IsNotEmpty()
  clientNit!: string;

  @ApiProperty({ description: 'Razón Social o Nombre del titular de la factura', example: 'BANCO MERCANTIL SANTA CRUZ S.A.' })
  @IsString()
  @IsNotEmpty()
  clientBusinessName!: string;

  @ApiPropertyOptional({ description: 'Correo electrónico para recepción de factura digital', example: 'contabilidad@empresa.bo' })
  @IsOptional()
  @IsString()
  clientEmail?: string;

  @ApiPropertyOptional({ description: 'Método de pago utilizado', example: 'qr_bolivia' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
