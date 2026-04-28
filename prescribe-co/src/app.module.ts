import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import {
  appConfig,
  dbConfig,
  jwtConfig,
  throttleConfig,
  storageConfig,
} from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { QuestionnairesModule } from './modules/questionnaires/questionnaires.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AuditModule } from './modules/audit/audit.module';
import { DispenserModule } from './modules/dispenser/dispenser.module';
import { PrescriberModule } from './modules/prescriber/prescriber.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuditInterceptor } from './modules/audit/interceptors/audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RbacDemoController } from './modules/auth/rbac-demo.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, dbConfig, jwtConfig, throttleConfig, storageConfig],
      envFilePath: '.env',
    }),
    ThrottlerModule.forRootAsync({
      inject: [],
      useFactory: () => ({
        throttlers: [{
          ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
          limit: parseInt(process.env.THROTTLE_LIMIT ?? '20', 10),
        }],
      }),
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
    ProductsModule,
    QuestionnairesModule,
    PrescriptionsModule,
    DocumentsModule,
    AuditModule,
    PrescriberModule,
    DispenserModule,
    PaymentsModule,
  ],
  controllers: [RbacDemoController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
