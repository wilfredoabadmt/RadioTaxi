import { IsArray, ValidateNested, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Datos de un vehículo candidato para la sugerencia de asignación.
 */
export class DispatchVehicleDto {
  @IsNumber()
  @Min(1)
  vehicleId!: number;

  @IsOptional()
  @IsNumber()
  currentLatitude?: number;

  @IsOptional()
  @IsNumber()
  currentLongitude?: number;

  @IsOptional()
  vehicleType?: string;

  @IsOptional()
  plate?: string;
}

/**
 * Datos de una solicitud de viaje pendiente para la sugerencia de asignación.
 */
export class DispatchTripRequestDto {
  @IsNumber()
  @Min(1)
  tripRequestId!: number;

  @IsOptional()
  @IsNumber()
  originLat?: number;

  @IsOptional()
  @IsNumber()
  originLng?: number;

  @IsOptional()
  originAddress?: string;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @IsOptional()
  destinationAddress?: string;
}

/**
 * Payload completo para pedir al orquestador de IA una sugerencia
 * de asignación vehículo ↔ solicitud de viaje.
 */
export class DispatchSuggestionDto {
  @ValidateNested()
  @Type(() => DispatchTripRequestDto)
  tripRequest!: DispatchTripRequestDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DispatchVehicleDto)
  vehicles!: DispatchVehicleDto[];
}
