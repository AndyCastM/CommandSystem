import { IsNotEmpty , IsInt, IsPositive, IsString} from "class-validator";

export class CreateCompanyProductDto {
    @IsInt()
    @IsNotEmpty()
    @IsPositive()
    id_area: number;

    @IsInt()
    @IsNotEmpty()
    @IsPositive()
    id_category: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsPositive()
    base_price: number;

    @IsString()
    image_url?: string;

    @IsInt()
    preparation_time?: number; // en minutos

    options?: {
        name: string;
        is_required?: number;
        multi_select?: number;
        max_selection?: number;
        tiers?: {
            selection_count: number;
            extra_price: number;
        }[];
        values?: {
            name: string;
            extra_price?: number;
        }[];
    }[];
}
