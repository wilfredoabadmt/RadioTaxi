import { IsInt, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTripFareDto {
  @IsInt()
  tripId!: number;

  @IsInt()
  pricingRuleId!: number;

  @IsNumber()
  @Min(0)
  distanceMeters!: number;

  @IsNumber()
  @Min(0)
  durationSeconds!: number;

  @IsNumber()
  totalFare!: number;

  @IsOptional()
  @IsNotEmpty()
  notes?: string;
}
