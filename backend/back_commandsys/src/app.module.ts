import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommandsModule } from './commands/commands.module';
import { BranchesModule } from './branches/branches.module';
import { TablesModule } from './tables/tables.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env` ,
      isGlobal: true
    }),
    PrismaModule, ProductsModule, UsersModule, AuthModule, CommandsModule, BranchesModule, TablesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
