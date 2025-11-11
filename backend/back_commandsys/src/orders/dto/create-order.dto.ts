import {
  IsArray,
  IsInt,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemOptionDto {
  @IsInt()
  id_option_value: number;
}

class ComboGroupSelectionDto {
  @IsInt()
  id_company_product: number; // producto elegido dentro del combo
  @IsOptional()
  name?: string;

  @IsOptional()
  extra_price?: number;
}

class ComboGroupDto {
  @IsInt()
  id_combo_group: number;

  @IsOptional()
  label?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboGroupSelectionDto)
  selected_options: ComboGroupSelectionDto[];
}

class OrderItemDto {
  @IsOptional()
  id_branch_product?: number;

  @IsOptional()
  id_combo?: number;

  @IsInt()
  quantity: number;

  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemOptionDto)
  options: OrderItemOptionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboGroupDto)
  combo_groups: ComboGroupDto[];
}

export class CreateOrderDto {
  @IsInt()
  id_session: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
