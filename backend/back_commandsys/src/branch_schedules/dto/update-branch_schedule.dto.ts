import { PartialType } from '@nestjs/mapped-types';
import { CreateBranchScheduleDto } from './create-branch_schedule.dto';

export class UpdateBranchScheduleDto extends PartialType(CreateBranchScheduleDto) {}
