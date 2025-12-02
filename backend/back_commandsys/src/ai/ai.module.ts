import { Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { HttpModule } from '@nestjs/axios';
import { AIController } from './ai.controller';

@Module({
  imports: [HttpModule],
  controllers: [AIController],
  providers: [AIService],
  exports: [AIService],
})
export class AiModule {}
