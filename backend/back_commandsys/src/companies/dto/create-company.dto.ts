import { 
  IsNotEmpty,
  IsString,
  IsEmail,
  Matches,
  IsOptional,
  MaxLength,
  MinLength,
  IsPhoneNumber,
  IsNumberString
} from 'class-validator';

export class CreateCompanyDto {

  // ===========================
  // DATOS DE LA EMPRESA
  // ===========================

  @IsNotEmpty({ message: 'El nombre comercial es requerido' })
  @IsString()
  @MinLength(2, { message: 'El nombre comercial es muy corto' })
  @MaxLength(80, { message: 'El nombre comercial es muy largo' })
  name: string;

  @IsNotEmpty({ message: 'La razón social es requerida' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  legal_name: string;

  @IsNotEmpty()
  @Matches(
    /^([A-ZÑ&]{3,4})(\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[A-Z0-9]{3}$/,
    { message: 'RFC inválido (formato incorrecto)' }
  )
  rfc: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  street: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(4)
  num_ext?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  colony: string;

  @IsNotEmpty()
  @Matches(/^\d{5}$/, { message: 'Código postal inválido' })
  cp: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  city: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  state: string;

  @IsNotEmpty()
  @IsPhoneNumber('MX', { message: 'Número telefónico inválido' })
  phone: string;

  @IsNotEmpty()
  @IsEmail({}, { message: 'Correo electrónico inválido' })
  @MaxLength(100)
  email: string;

  // ===========================
  // DATOS DEL USUARIO ADMIN
  // ===========================

  @IsNotEmpty()
  @IsString()
  @MinLength(4, { message: 'El usuario es demasiado corto' })
  @MaxLength(40)
  admin_username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras',
  })
  admin_name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras',
  })
  admin_last_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-zA-ZÁÉÍÓÚáéíóúñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras',
  })
  admin_last_name2?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @MaxLength(50)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/, {
    message:
      'La contraseña debe tener mayúscula, minúscula y número',
  })
  admin_password: string;
}
