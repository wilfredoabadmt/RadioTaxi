import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateTripFareDto {
  @IsInt()
  tripId!: number;

  @IsInt()
  pricingRuleId!: number;

  @IsNumber()
  @Min(0)
  baseFare!: number;

  @IsInt()
  @Min(0)
  distanceMeters!: number;

  @IsInt()
  @Min(0)
  durationSeconds!: number;

  @IsNumber()
  @Min(0)
  totalFare!: number;
}
