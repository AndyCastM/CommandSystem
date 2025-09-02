import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Hacerlo disponible en toda la app sin importar imports
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
