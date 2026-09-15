import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentWebhookDto {
  @ApiProperty({ example: 'qr_simple', description: 'Nombre del proveedor de pagos (qr_simple, bcp, pagofacil, stripe)' })
  @IsString()
  @IsNotEmpty()
  provider!: string;

  @ApiProperty({ example: 'TX-998241', description: 'Identificador único de la transacción en la pasarela' })
  @IsString()
  @IsNotEmpty()
  transactionId!: string;

  @ApiProperty({ example: 1, description: 'ID del viaje asociado' })
  @IsNumber()
  @IsNotEmpty()
  tripId!: number;

  @ApiProperty({ example: 25.5, description: 'Monto liquidado' })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({ example: 'SUCCESS', description: 'Estado reportado por la pasarela (SUCCESS, FAILED)' })
  @IsString()
  @IsNotEmpty()
  status!: string;

  @ApiPropertyOptional({ example: 'sig_abc123', description: 'Firma criptográfica de verificación del webhook' })
  @IsString()
  @IsOptional()
  signature?: string;
}
