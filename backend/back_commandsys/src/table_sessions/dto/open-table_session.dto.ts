import { IsInt, IsPositive, Min } from 'class-validator';

export class OpenTableSessionDto {
  @IsInt()
  @IsPositive()
  @Min(1)
  guests: number;
}
