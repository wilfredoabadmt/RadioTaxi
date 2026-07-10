import { IsInt } from 'class-validator';

export class CreateTripDto {
  @IsInt()
  tripRequestId!: number;

  @IsInt()
  driverId!: number;
}
