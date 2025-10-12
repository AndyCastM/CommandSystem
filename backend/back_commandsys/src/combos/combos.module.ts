import { Module } from '@nestjs/common';
import { CombosService } from './services/combos.service';
import { CombosController } from './controllers/combos.controller';

@Module({
  controllers: [CombosController],
  providers: [CombosService],
})
export class CombosModule {}
