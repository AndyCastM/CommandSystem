// src/users/dto/create-user.dto.ts
import { IsString, MinLength, IsInt } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  user: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsInt()
  rol_id: number;
}
