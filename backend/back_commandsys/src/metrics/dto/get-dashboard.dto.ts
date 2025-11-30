import { IsDateString, IsOptional, IsInt } from 'class-validator';

export class GetDashboardDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsInt()
  id_branch?: number; // sucursal que quiere ver el admin
}
