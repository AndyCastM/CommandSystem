// src/users/dto/create-user.dto.ts
import { IsString, MinLength, IsInt, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  
  @IsNotEmpty()
  @IsInt()
  id_branch: number;

  @IsNotEmpty()
  @IsInt()
  id_role: number;
  
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;


}
