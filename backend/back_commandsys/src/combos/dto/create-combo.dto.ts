import { IsNumber, IsString, IsInt } from "class-validator";

export class ComboItemDto {
    id_company_product: number;
    quantity: number;
}

export class CreateComboDto {
    @IsString()
    name: string;

    @IsString()
    description?: string;

    @IsNumber()
    base_price: number;

    items: ComboItemDto[];
}
