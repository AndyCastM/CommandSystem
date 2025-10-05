import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateTableLocationDto {
    @IsString()
    @IsNotEmpty()
    name: string;
}
