import { IsNotEmpty, IsString , IsOptional, Matches, IsInt, IsPositive, MaxLength, IsPhoneNumber} from 'class-validator';

export class CreateBranchDto {

    id_company: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    street: string;

    @IsString()
    @IsOptional()
    num_ext: string;

    @IsString()
    @IsNotEmpty()
    colony: string;

    @IsNotEmpty()
    @Matches(/^\d{5}$/, { message: 'Código postal inválido' })
    cp: string;

    @IsString()
    @IsNotEmpty()
    city: string;

    @IsString()
    @IsNotEmpty()
    state: string;

    @IsString()
    @IsOptional()
    @IsPhoneNumber("MX")
    phone: string;

    @IsString()
    @IsNotEmpty()
    email: string;
}
