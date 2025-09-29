import { IsNotEmpty, IsString, IsEmail, Matches, IsOptional, MaxLength, MinLength, IsPhoneNumber, IsNumber } from 'class-validator';

export class CreateCompanyDto {

    @IsNotEmpty()
    @IsString()
    name: string; // Nombre comercial

    @IsNotEmpty()
    @IsString()
    legal_name: string; // Razón social

    @IsNotEmpty()
    @Matches(/^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/, {
        message: 'RFC inválido',
    })
    rfc: string;

    @IsNotEmpty()
    @IsString()
    street: string;

    @IsOptional()
    @IsString()
    @MaxLength(4)
    num_ext?: string;

    @IsNotEmpty()
    @IsString()
    colony: string;

    @Matches(/^\d{5}$/, { message: 'Código postal inválido' })
    cp: string;

    @IsNotEmpty()
    @IsString()
    city: string;

    @IsNotEmpty()
    @IsString()
    state: string;

    @IsNotEmpty()
    @IsPhoneNumber("MX")
    phone: string;

    @IsEmail()
    email: string;

    // Datos del usuario admin de la empresa
    @IsNotEmpty()
    @IsString()
    admin_username: string;

    @IsNotEmpty()
    @IsString()
    admin_name: string;

    @IsNotEmpty()
    @IsString()
    admin_last_name: string;

    @IsOptional()
    @IsString()
    admin_last_name2: string;

    @IsNotEmpty()
    @IsString()
    admin_password: string;
    
}
