import { Module } from '@nestjs/common';
import { CashService } from './services/cash.service';
import { CashController } from './controllers/cash.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [CashController],
  providers: [CashService, PrismaService],
})
export class CashModule {}
