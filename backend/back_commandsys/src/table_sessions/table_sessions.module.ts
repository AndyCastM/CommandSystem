import { Module } from '@nestjs/common';
import { TableSessionsService } from './services/table_sessions.service';
import { TableSessionsController } from './controllers/table_sessions.controller';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';
@Module({
  controllers: [TableSessionsController],
  providers: [TableSessionsService, NotificationsGateway],
})
export class TableSessionsModule {}
