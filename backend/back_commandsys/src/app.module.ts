import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CommandsModule } from './commands/commands.module';
import { BranchesModule } from './branches/branches.module';
import { TablesModule } from './tables/tables.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CompaniesModule } from './companies/companies.module';
import { BranchSchedulesModule } from './branch_schedules/branch_schedules.module';
import { TableLocationsModule } from './table_locations/table_locations.module';
import { TableSessionsModule } from './table_sessions/table_sessions.module';
import { ProductCategoriesModule } from './product_categories/product_categories.module';
import { PrintAreasModule } from './print_areas/print_areas.module';
import { CompanyProductsModule } from './company_products/company_products.module';
import { CombosModule } from './combos/combos.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env` ,
      isGlobal: true
    }),
    PrismaModule, CompanyProductsModule, UsersModule, AuthModule, CommandsModule, BranchesModule, TablesModule, CompaniesModule, BranchSchedulesModule, TableLocationsModule, TableSessionsModule, ProductCategoriesModule, PrintAreasModule, CombosModule, CloudinaryModule, AiModule],
  providers: [{
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
  {
    provide: APP_GUARD,
    useClass: RolesGuard
  },
  ],
})
export class AppModule {}
