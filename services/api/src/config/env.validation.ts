import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  DATABASE_URL?: string;

  @IsString()
  @IsOptional()
  @MinLength(16)
  JWT_SECRET?: string;

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS?: string;

  @IsString()
  @IsOptional()
  PRICING_ENGINE_URL?: string;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((e) => Object.values(e.constraints || {}).join(', '))
      .join('; ');
    throw new Error(`[Config Validation Error]: ${messages}`);
  }

  // Validación estricta adicional para producción
  if (validatedConfig.NODE_ENV === Environment.Production) {
    if (!validatedConfig.JWT_SECRET || validatedConfig.JWT_SECRET.length < 32) {
      throw new Error(
        '[Config Validation Error]: En producción, JWT_SECRET debe tener al menos 32 caracteres.',
      );
    }
    if (validatedConfig.JWT_SECRET === 'dev-insecure-secret-change-in-production') {
      throw new Error(
        '[Config Validation Error]: En producción, JWT_SECRET no puede usar el valor inseguro por defecto.',
      );
    }
  }

  return validatedConfig;
}
