import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCorporateReservationDto {
  @ApiProperty({ example: 1, description: 'ID de la cuenta corporativa cliente' })
  @IsNumber()
  @IsNotEmpty()
  corporateAccountId!: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del centro de costo que asume el gasto' })
  @IsNumber()
  @IsOptional()
  costCenterId?: number;

  @ApiProperty({ example: 1, description: 'ID del usuario pasajero (o empleado corporativo)' })
  @IsNumber()
  @IsNotEmpty()
  customerId!: number;

  @ApiProperty({ example: '2026-09-16T14:30:00Z', description: 'Fecha y hora programada para el viaje' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt!: string;

  @ApiProperty({ example: 'Av. 16 de Julio #1490, El Prado', description: 'Punto de partida o recogida' })
  @IsString()
  @IsNotEmpty()
  originAddress!: string;

  @ApiProperty({ example: 'Aeropuerto Internacional El Alto, Terminal 1', description: 'Punto de destino' })
  @IsString()
  @IsNotEmpty()
  destinationAddress!: string;

  @ApiPropertyOptional({ example: 'Traslado de ejecutivo para vuelo de negocios a Santa Cruz', description: 'Motivo del viaje corporativo' })
  @IsString()
  @IsOptional()
  tripReason?: string;

  @ApiPropertyOptional({ example: 65.0, description: 'Costo estimado presupuestado en BOB' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  estimatedCost?: number;
}
