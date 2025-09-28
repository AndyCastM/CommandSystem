// src/users/dto/create-user.dto.ts
import { IsString, MinLength, IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateUserDto {
  
  @IsInt()
  id_company: number;

  @IsInt()
  @IsOptional()
  id_branch?: number;

  @IsNotEmpty()
  @IsInt()
  id_role: number;
  
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  last_name: string;

  @IsString()
  @IsOptional()
  last_name2?: string;

  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

}
