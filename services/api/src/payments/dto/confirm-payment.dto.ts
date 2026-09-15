import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ConfirmPaymentDto {
  @ApiProperty({ example: 1, description: 'ID del viaje' })
  @IsNumber()
  @IsNotEmpty()
  tripId!: number;

  @ApiProperty({
    example: 'qr_bolivia',
    description: 'Método utilizado para liquidar el pago',
    enum: ['cash', 'card', 'qr_bolivia', 'corporate_account'],
  })
  @IsString()
  @IsIn(['cash', 'card', 'qr_bolivia', 'corporate_account'])
  @IsNotEmpty()
  paymentMethod!: 'cash' | 'card' | 'qr_bolivia' | 'corporate_account';

  @ApiProperty({ example: 25.5, description: 'Monto total cobrado en Bolivianos (BOB)' })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount!: number;

  @ApiPropertyOptional({ example: 'BNB-QR-98321048', description: 'Código de transacción, referencia bancaria o voucher POS' })
  @IsString()
  @IsOptional()
  transactionReference?: string;

  @ApiPropertyOptional({ example: 'Cobro en efectivo entregado a conductor', description: 'Observaciones adicionales' })
  @IsString()
  @IsOptional()
  notes?: string;
}
