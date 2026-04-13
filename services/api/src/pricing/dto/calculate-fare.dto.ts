import { IsNumber, IsOptional, Min } from 'class-validator';

export class CalculateFareDto {
  @IsNumber()
  ruleId!: number;

  @IsNumber()
  @Min(0)
  distanceKm!: number;

  @IsNumber()
  @Min(0)
  durationMinutes!: number;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsNumber()
  originLat?: number;

  @IsOptional()
  @IsNumber()
  originLng?: number;

  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @IsOptional()
  @IsNumber()
  destinationLng?: number;
}
