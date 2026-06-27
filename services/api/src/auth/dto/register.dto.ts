import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength
} from 'class-validator';

// Roles válidos en el sistema
export const VALID_ROLES = ['USER', 'DRIVER', 'DISPATCHER', 'ADMIN'] as const;
export type Role = (typeof VALID_ROLES)[number];

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(VALID_ROLES)
  role?: string;

  @IsOptional()
  companyId?: number;
}
