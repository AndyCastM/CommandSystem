import { Module, forwardRef } from '@nestjs/common';
import { BranchSchedulesService } from './services/branch_schedules.service';
import { BranchSchedulesController } from './controllers/branch_schedules.controller';
import { BranchesModule } from 'src/branches/branches.module';

@Module({
  imports: [forwardRef(() => BranchesModule)],
  controllers: [BranchSchedulesController],
  providers: [BranchSchedulesService],
  exports: [BranchSchedulesService],
})
export class BranchSchedulesModule {}
