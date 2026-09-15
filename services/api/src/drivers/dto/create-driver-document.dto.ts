import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDriverDocumentDto {
  @ApiProperty({
    example: 'SOAT',
    description: 'Tipo de documento (LICENCIA, SOAT, INSPECCION_TECNICA, ANTECEDENTES_FELCC, SEGURO)',
  })
  @IsString()
  @IsNotEmpty()
  documentType!: string;

  @ApiProperty({ example: 'SOAT-2026-881920', description: 'Número o identificador del documento' })
  @IsString()
  @IsNotEmpty()
  documentNumber!: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00Z', description: 'Fecha de emisión' })
  @IsDateString()
  @IsOptional()
  issuedAt?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z', description: 'Fecha de vencimiento o expiración' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'https://docs.radiotaxi.bo/soat/881920.pdf', description: 'Enlace o URL del archivo escaneado' })
  @IsString()
  @IsOptional()
  fileUrl?: string;
}
