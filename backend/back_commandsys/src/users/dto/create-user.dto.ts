// src/users/dto/create-user.dto.ts
import { IsString, MinLength, IsInt, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  user: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsInt()
  rol_id: number;
}
