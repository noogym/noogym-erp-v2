import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentsModule } from './appointments/appointments.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { AuthModule } from './auth/auth.module';
import { CheckinsModule } from './checkins/checkins.module';
import { ClassesModule } from './classes/classes.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { DatabaseReadinessInterceptor } from './common/interceptors/database-readiness.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { validateEnv } from './config/env.validation';
import { EmployeesModule } from './employees/employees.module';
import { EntrypointsModule } from './entrypoints/entrypoints.module';
import { ExercisesModule } from './exercises/exercises.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FinanceModule } from './finance/finance.module';
import { GymsModule } from './gyms/gyms.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { MembersModule } from './members/members.module';
import { MessagesModule } from './messages/messages.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PaymentsModule } from './payments/payments.module';
import { PlansModule } from './plans/plans.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { ReportsModule } from './reports/reports.module';
import { SalesModule } from './sales/sales.module';
import { SettingsModule } from './settings/settings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL_MS ?? 60000),
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    PrismaModule,
    EntrypointsModule,
    AuthModule,
    OrganizationsModule,
    GymsModule,
    UsersModule,
    MembersModule,
    PlansModule,
    SubscriptionsModule,
    PaymentsModule,
    ProductsModule,
    SalesModule,
    SettingsModule,
    SuperAdminModule,
    EmployeesModule,
    ClassesModule,
    CheckinsModule,
    ExpensesModule,
    FinanceModule,
    ExercisesModule,
    WorkoutsModule,
    AppointmentsModule,
    MessagesModule,
    IntegrationsModule,
    AuditLogsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: DatabaseReadinessInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
