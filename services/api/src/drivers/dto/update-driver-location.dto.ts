import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateDriverLocationDto {
  @ApiProperty({ description: 'Latitud GPS actual', example: -16.5000 })
  @IsNumber()
  lat!: number;

  @ApiProperty({ description: 'Longitud GPS actual', example: -68.1500 })
  @IsNumber()
  lng!: number;

  @ApiPropertyOptional({ description: 'Estado operativo opcional', example: 'available' })
  @IsOptional()
  @IsString()
  status?: string;
}
