// src/users/dto/update-user.dto.ts

import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsNotEmpty } from 'class-validator';

// Con partial type todos los campos de CreateUserDto son opcionales
// se mantienen los mismos validadores que en CreateUserDto
export class UpdateUserDto extends PartialType(CreateUserDto) {
    // Agregamos el id_user como obligatorio para identificar qué usuario actualizar
    @IsNotEmpty()
    id_user: number;
}
