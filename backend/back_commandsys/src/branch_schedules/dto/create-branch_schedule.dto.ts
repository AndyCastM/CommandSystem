import { IsInt, IsBoolean, IsNotEmpty, IsMilitaryTime } from 'class-validator';

export class CreateBranchScheduleDto {
    @IsNotEmpty()
    @IsInt()
    day_of_week: number;

    @IsMilitaryTime()
    open_time: string;

    @IsMilitaryTime()
    close_time: string;

    @IsBoolean()
    is_open: boolean;
}
