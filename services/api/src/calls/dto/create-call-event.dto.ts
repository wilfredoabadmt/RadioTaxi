import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsIn, IsDateString } from 'class-validator';

export class CreateCallEventDto {
  @ApiProperty({ example: 'call-1726359000-xyz', description: 'Identificador único de la llamada Asterisk (UNIQUEID o UUID)' })
  @IsString()
  @IsNotEmpty()
  callUuid!: string;

  @ApiProperty({ example: '+59170123456', description: 'Número telefónico del llamante' })
  @IsString()
  @IsNotEmpty()
  fromNumber!: string;

  @ApiPropertyOptional({ example: '+59122223333', description: 'Número DID o línea de cabina receptora' })
  @IsString()
  @IsOptional()
  toNumber?: string;

  @ApiPropertyOptional({ example: 'Cliente Juan Perez', description: 'Identificador CallerID informado por la central' })
  @IsString()
  @IsOptional()
  callerId?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID de la empresa de radio taxi' })
  @IsNumber()
  @IsOptional()
  companyId?: number;

  @ApiProperty({ example: 'RINGING', enum: ['RINGING', 'ANSWERED', 'ENDED'] })
  @IsString()
  @IsIn(['RINGING', 'ANSWERED', 'ENDED'])
  eventType!: 'RINGING' | 'ANSWERED' | 'ENDED';

  @ApiPropertyOptional({ example: '2026-09-15T04:30:00.000Z' })
  @IsDateString()
  @IsOptional()
  startedAt?: string;

  @ApiPropertyOptional({ example: '2026-09-15T04:32:15.000Z' })
  @IsDateString()
  @IsOptional()
  endedAt?: string;

  @ApiPropertyOptional({ example: 135, description: 'Duración facturada en segundos' })
  @IsNumber()
  @IsOptional()
  durationSeconds?: number;

  @ApiPropertyOptional({ example: 'https://storage.radiotaxi.bo/recordings/call-1726359000.wav' })
  @IsString()
  @IsOptional()
  recordingUrl?: string;
}
