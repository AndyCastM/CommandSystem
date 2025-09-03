import { Module } from '@nestjs/common';
import { CommandsController } from './controllers/commands.controller';
import { CommandsService } from './services/commands.service';

@Module({
  controllers: [CommandsController],
  providers: [CommandsService]
})
export class CommandsModule {}
