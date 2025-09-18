import { IsNotEmpty, IsString , IsOptional} from 'class-validator';

export class CreateBranchDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsOptional()
    phone: string;

    @IsString()
    @IsNotEmpty()
    email: string;
}
