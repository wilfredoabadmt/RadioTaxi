import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateGeofenceDto {
  @ApiProperty({ example: 1, description: 'ID de la empresa administradora' })
  @IsNumber()
  @IsNotEmpty()
  companyId!: number;

  @ApiProperty({ example: 'Zona Aeropuerto El Alto', description: 'Nombre descriptivo de la geocerca' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'AIRPORT', description: 'Tipo de geocerca (ZONE, AIRPORT, RESTRICTED, DOWNTOWN)' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 15.0, description: 'Recargo económico por ingresar o salir de esta zona (en BOB)' })
  @IsNumber()
  @Min(0)
  surcharge!: number;

  @ApiProperty({
    example: '{"type":"Polygon","coordinates":[[[-68.19,-16.51],[-68.17,-16.51],[-68.17,-16.50],[-68.19,-16.50],[-68.19,-16.51]]]}',
    description: 'Definición GeoJSON del polígono perimetral de la zona'
  })
  @IsString()
  @IsNotEmpty()
  areaGeoJson!: string;
}
