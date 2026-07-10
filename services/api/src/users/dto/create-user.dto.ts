import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { VALID_ROLES } from '../../auth/dto/register.dto';

export class CreateUserDto {
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
  @IsIn(VALID_ROLES)
  role?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
