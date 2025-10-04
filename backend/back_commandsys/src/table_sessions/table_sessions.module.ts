import { Module } from '@nestjs/common';
import { TableSessionsService } from './services/table_sessions.service';
import { TableSessionsController } from './controllers/table_sessions.controller';

@Module({
  controllers: [TableSessionsController],
  providers: [TableSessionsService],
})
export class TableSessionsModule {}
