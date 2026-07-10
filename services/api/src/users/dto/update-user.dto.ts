import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { VALID_ROLES } from '../../auth/dto/register.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(VALID_ROLES)
  role?: string;

  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @IsOptional()
  @IsInt()
  companyId?: number;
}
