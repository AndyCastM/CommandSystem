import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchScheduleDto } from './create-branch_schedule.dto';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';

export class UpdateBranchScheduleDto extends PartialType(CreateBranchScheduleDto) {
    @IsNotEmpty()
    @IsInt()
    day_of_week: number;
}
