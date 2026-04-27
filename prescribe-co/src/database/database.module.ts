import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../modules/users/entities/user.entity';
import { PrescriberProfile } from '../modules/users/entities/prescriber-profile.entity';
import { RefreshToken } from '../modules/users/entities/refresh-token.entity';
import { Product } from '../modules/products/entities/product.entity';
import { Category } from '../modules/products/entities/category.entity';
import { Questionnaire } from '../modules/questionnaires/entities/questionnaire.entity';
import { QuestionnaireResponse } from '../modules/questionnaires/entities/questionnaire-response.entity';
import { PrescriptionRequest } from '../modules/prescriptions/entities/prescription-request.entity';
import { PrescriptionDocument } from '../modules/documents/entities/prescription-document.entity';

import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { Payment } from '../modules/payments/entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('db.host'),
        port: config.get<number>('db.port'),
        database: config.get<string>('db.name'),
        username: config.get<string>('db.user'),
        password: config.get<string>('db.password'),
        entities: [
          User, PrescriberProfile, RefreshToken,
          Product, Category,
          Questionnaire, QuestionnaireResponse,
          PrescriptionRequest, PrescriptionDocument,
          AuditLog,
          Payment,
        ],
        // Never true in production — use migrations
        synchronize: config.get<string>('app.nodeEnv') === 'development',
        logging: config.get<string>('app.nodeEnv') === 'development',
        charset: 'utf8mb4',
        timezone: 'Z',
        // Connection pool sizing
        extra: {
          connectionLimit: 10,
        },
      }),
    }),
  ],
})
export class DatabaseModule {}
