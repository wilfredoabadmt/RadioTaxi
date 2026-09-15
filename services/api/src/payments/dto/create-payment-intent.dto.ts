import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePaymentIntentDto {
  @ApiProperty({ example: 1, description: 'ID del viaje para el cobro' })
  @IsNumber()
  @IsNotEmpty()
  tripId!: number;

  @ApiProperty({
    example: 'qr_bolivia',
    description: 'Método de pago seleccionado',
    enum: ['cash', 'card', 'qr_bolivia', 'corporate_account'],
  })
  @IsString()
  @IsIn(['cash', 'card', 'qr_bolivia', 'corporate_account'])
  @IsNotEmpty()
  paymentMethod!: 'cash' | 'card' | 'qr_bolivia' | 'corporate_account';

  @ApiPropertyOptional({ example: '348921028', description: 'NIT o Documento de Identidad del cliente' })
  @IsString()
  @IsOptional()
  customerNit?: string;

  @ApiPropertyOptional({ example: 'Juan Pérez', description: 'Nombre o Razón Social del cliente' })
  @IsString()
  @IsOptional()
  customerName?: string;
}
