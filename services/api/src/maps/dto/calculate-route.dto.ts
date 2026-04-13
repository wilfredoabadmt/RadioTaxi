import { IsNotEmpty, IsString } from 'class-validator';

export class CalculateRouteDto {
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;
}
