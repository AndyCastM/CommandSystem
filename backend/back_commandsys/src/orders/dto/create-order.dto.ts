import {
  IsArray,
  IsInt,
  IsOptional,
  ValidateNested,
  IsEnum,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

enum OrderType {
  dine_in = 'dine_in',
  takeout = 'takeout',
}

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

export class OrderItemDto {
  @IsOptional()
  id_branch_product?: number;

  @IsOptional()
  id_combo?: number;

  @IsInt()
  quantity: number;

  @IsOptional()
  notes?: string;

  group_number?: number;

  @IsOptional() 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemOptionDto)
  options?: OrderItemOptionDto[];

  @IsOptional() 
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboGroupDto)
  combo_groups?: ComboGroupDto[];
}

export class CreateOrderDto {
  @IsOptional()
  @IsInt()
  id_session: number;

  @IsString()
  @IsOptional()
  notes?: string;
  
  @IsEnum(OrderType)
  order_type: OrderType;

  @IsString()
  @IsOptional()
  customer_name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
