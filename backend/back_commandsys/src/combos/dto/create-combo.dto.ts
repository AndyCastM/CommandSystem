import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateComboDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  base_price: number;

  // Productos fijos
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemDto)
  @IsOptional()
  items?: ComboItemDto[];

  // Grupos configurables ("elige 2 bebidas", etc.)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboGroupDto)
  @IsOptional()
  groups?: ComboGroupDto[];
}

// ---------------------------------------------
// Productos fijos del combo
// ---------------------------------------------
export class ComboItemDto {
  @IsInt()
  id_company_product: number;

  @IsInt()
  @Min(1)
  quantity: number;
}

// ---------------------------------------------
// Grupo configurable ("elige X opciones")
// ---------------------------------------------
export class ComboGroupDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsInt()
  @Min(1)
  max_selection: number;

  @IsBoolean()
  @IsOptional()
  is_required?: boolean = true;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboGroupOptionDto)
  options: ComboGroupOptionDto[];
}

// ---------------------------------------------
// Opciones dentro de un grupo configurable
// ---------------------------------------------
export class ComboGroupOptionDto {
  @IsInt()
  id_company_product: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  extra_price?: number;
}
