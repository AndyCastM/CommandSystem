import { IsDateString, IsOptional } from 'class-validator';

export class GetDashboardDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}
