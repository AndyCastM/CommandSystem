import { Module, MiddlewareConsumer } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
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
import { ScheduleModule } from '@nestjs/schedule';
import { OrdersModule } from './orders/orders.module';
import { AlexaModule } from './alexa/alexa.module';
import { MetricsModule } from './metrics/metrics.module';
import { CashModule } from './cash/cash.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env` ,
      isGlobal: true
    }),
    PrismaModule, CompanyProductsModule, UsersModule, AuthModule, 
    BranchesModule, TablesModule, CompaniesModule, 
    BranchSchedulesModule, TableLocationsModule, TableSessionsModule, 
    ProductCategoriesModule, PrintAreasModule, CombosModule, CloudinaryModule, 
    AiModule, ScheduleModule.forRoot(), OrdersModule, AlexaModule, MetricsModule, CashModule, PaymentsModule],
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
