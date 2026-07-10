import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

// Actualiza datos del conductor y/o su estado operativo.
export class UpdateDriverDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string; // ISO date

  @IsOptional()
  @IsInt()
  experienceYears?: number;

  @IsOptional()
  @IsIn(['available', 'busy', 'offline'])
  status?: string;
}
