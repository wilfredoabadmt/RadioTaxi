import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateTripFromCallDto {
  @ApiProperty({ example: 'Av. Arce esq. Cordero, San Jorge, La Paz', description: 'Dirección de recogida del pasajero' })
  @IsString()
  @IsNotEmpty()
  originAddress!: string;

  @ApiPropertyOptional({ example: -16.5123, description: 'Latitud de origen' })
  @IsNumber()
  @IsOptional()
  originLat?: number;

  @ApiPropertyOptional({ example: -68.1234, description: 'Longitud de origen' })
  @IsNumber()
  @IsOptional()
  originLng?: number;

  @ApiPropertyOptional({ example: 'Aeropuerto Internacional de El Alto', description: 'Dirección de destino sugerida' })
  @IsString()
  @IsOptional()
  destinationAddress?: string;

  @ApiPropertyOptional({ example: -16.5135, description: 'Latitud de destino' })
  @IsNumber()
  @IsOptional()
  destinationLat?: number;

  @ApiPropertyOptional({ example: -68.1822, description: 'Longitud de destino' })
  @IsNumber()
  @IsOptional()
  destinationLng?: number;

  @ApiPropertyOptional({ example: 'Carlos Quispe', description: 'Nombre del pasajero informado por teléfono' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: 'Llamó solicitando vehículo con maletero amplio', description: 'Notas del operador telefónico' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de empresa de radiotaxi' })
  @IsNumber()
  @IsOptional()
  companyId?: number;
}
