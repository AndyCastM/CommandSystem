import { Module } from "@nestjs/common";
import { PrismaModule } from '../prisma/prisma.module';
import { UsersService } from './services/users.service';
import { UsersController } from './controllers/users.controller';

// Un module en NestJS es un contenedor de funcionalidades relacionadas
// Agrupa controllers, services y otros providers
@Module({
    imports: [PrismaModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController]
})
export class UsersModule {}
