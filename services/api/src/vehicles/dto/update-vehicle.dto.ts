import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

// Todos los campos opcionales para PATCH parcial (sin @nestjs/mapped-types).
export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  plate?: string;

  @IsOptional()
  @IsInt()
  driverId?: number;

  @IsOptional()
  @IsInt()
  companyId?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  gpsDeviceId?: string;
}
