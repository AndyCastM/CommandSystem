import { Module } from '@nestjs/common';
import { BranchSchedulesService } from './services/branch_schedules.service';
import { BranchSchedulesController } from './controllers/branch_schedules.controller';
import { BranchesModule } from 'src/branches/branches.module';

@Module({
  imports: [BranchesModule],
  controllers: [BranchSchedulesController],
  providers: [BranchSchedulesService],
})
export class BranchSchedulesModule {}
