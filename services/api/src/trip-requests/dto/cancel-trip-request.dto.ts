import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelTripRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
