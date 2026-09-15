import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePricingRuleDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa administradora' })
  @IsNumber()
  @IsNotEmpty()
  companyId!: number;

  @ApiProperty({ example: 'Tarifa Nocturna La Paz', description: 'Nombre descriptivo de la regla' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'NIGHT', description: 'Tipo de tarifa (STANDARD, NIGHT, AIRPORT, PEAK)' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 6.0, description: 'Tarifa base al iniciar viaje (en BOB)' })
  @IsNumber()
  @Min(0)
  baseFare!: number;

  @ApiProperty({ example: 3.5, description: 'Precio por kilómetro recorrido (en BOB)' })
  @IsNumber()
  @Min(0)
  kmRate!: number;

  @ApiProperty({ example: 0.6, description: 'Precio por minuto transcurrido (en BOB)' })
  @IsNumber()
  @Min(0)
  minuteRate!: number;

  @ApiProperty({ example: 12.0, description: 'Tarifa mínima aplicable al viaje (en BOB)' })
  @IsNumber()
  @Min(0)
  minFare!: number;

  @ApiPropertyOptional({ example: 0, description: 'Recargo fijo por peajes o autopistas (en BOB)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  tollSurcharge?: number;

  @ApiPropertyOptional({ example: 0, description: 'Recargo base por geocerca por defecto' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  geofenceSurcharge?: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Multiplicador por demanda o tarifa pico' })
  @IsNumber()
  @Min(1.0)
  @IsOptional()
  peakMultiplier?: number;

  @ApiPropertyOptional({ example: null, description: 'Polígono GeoJSON de aplicación opcional' })
  @IsString()
  @IsOptional()
  areaGeoJson?: string;

  @ApiPropertyOptional({ example: true, description: 'Si la regla está activa para cálculo' })
  @IsBoolean()
  @IsOptional()
  active?: boolean;
}
