import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTableDto {

    @IsInt()
    @IsNotEmpty()
    id_location : number;

    @IsString()
    @IsNotEmpty()
    number : string;

    @IsInt()
    @IsNotEmpty()
    capacity : number;
}
