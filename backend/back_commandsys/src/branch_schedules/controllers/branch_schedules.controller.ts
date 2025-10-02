import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { BranchSchedulesService } from '../services/branch_schedules.service';
import { CreateBranchScheduleDto } from '../dto/create-branch_schedule.dto';
import { UpdateBranchScheduleDto } from '../dto/update-branch_schedule.dto';

@Controller('branch-schedules')
export class BranchSchedulesController {
  constructor(private readonly branchSchedulesService: BranchSchedulesService) {}

  @Post()
  create(@Body() createBranchScheduleDto: CreateBranchScheduleDto) {
    return this.branchSchedulesService.create(createBranchScheduleDto);
  }

  @Get()
  findAll() {
    return this.branchSchedulesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.branchSchedulesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBranchScheduleDto: UpdateBranchScheduleDto) {
    return this.branchSchedulesService.update(+id, updateBranchScheduleDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.branchSchedulesService.remove(+id);
  }
}
