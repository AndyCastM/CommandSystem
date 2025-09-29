import { Module } from '@nestjs/common';
import { BranchesService } from './services/branches.service';
import { BranchesController } from './controllers/branches.controller';

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
})
export class BranchesModule {}
