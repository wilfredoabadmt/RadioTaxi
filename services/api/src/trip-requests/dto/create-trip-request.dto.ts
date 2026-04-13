import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateTripRequestDto {
  @IsNumber()
  customerId!: number;

  @IsOptional()
  @IsNumber()
  companyId?: number;

  @IsString()
  @IsNotEmpty()
  originAddress!: string;

  @IsNumber()
  originLat!: number;

  @IsNumber()
  originLng!: number;

  @IsString()
  @IsNotEmpty()
  destinationAddress!: string;

  @IsNumber()
  destinationLat!: number;

  @IsNumber()
  destinationLng!: number;

  @IsOptional()
  scheduledAt?: string;
}
