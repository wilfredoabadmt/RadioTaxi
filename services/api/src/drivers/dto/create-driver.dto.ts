import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateDriverDto {
  // --- Datos de la cuenta (User) ---
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;

  // --- Datos del conductor (Driver) ---
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  licenseExpiry?: string; // ISO date

  @IsOptional()
  @IsInt()
  experienceYears?: number;
}
