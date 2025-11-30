import { IsOptional, IsString } from 'class-validator';

export class GetCancellationsDto {
  @IsString()
  from: string;      

  @IsString()
  to: string;        

  @IsOptional()
  @IsString()
  id_user?: string;  // filtrar por quién canceló
}
