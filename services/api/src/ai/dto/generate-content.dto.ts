import { IsString, IsNotEmpty, MaxLength, IsOptional, IsNumber, IsInt, Min, Max } from 'class-validator';

export class GenerateContentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(8000)
  prompt!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  maxOutputTokens?: number;
}
