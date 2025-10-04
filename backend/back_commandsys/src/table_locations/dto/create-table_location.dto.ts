import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTableLocationDto {
    @IsInt()
    id_branch: number;

    @IsString()
    @IsNotEmpty()
    name: string;
}
