import { IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';

export class DescribeProductDto {
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;

  @IsString()
  @IsOptional()
  context?: string; // "hamburguesa", "bebida", etc.

  @IsString()
  @IsOptional()
  locale?: string; // "es-MX"
}
