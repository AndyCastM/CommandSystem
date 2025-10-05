import { Module, forwardRef } from '@nestjs/common';
import { BranchesService } from './services/branches.service';
import { BranchesController } from './controllers/branches.controller';
import { BranchSchedulesModule } from 'src/branch_schedules/branch_schedules.module';

// Como tenemos dependencia circular, usamos forwardRef
// Necesitamos de ambos servicios mutuamente
// ForwardRef permite que NestJS resuelva la dependencia en tiempo de ejecución
@Module({
imports: [forwardRef(() => BranchSchedulesModule)],
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
