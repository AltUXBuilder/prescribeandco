import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PAYMENT_PROVIDER_TOKEN } from './provider/payment-provider.interface';
import { StripePaymentProvider } from './provider/stripe-payment.provider';
import { MockPaymentProvider } from './provider/mock-payment.provider';
// AuditService is globally provided by @Global() AuditModule

@Module({
  imports: [TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    /**
     * Provider is selected at runtime based on NODE_ENV.
     * In production: StripePaymentProvider
     * In test/development: MockPaymentProvider
     *
     * To swap providers without changing this file, set PAYMENT_PROVIDER=stripe
     * in the environment and read it here, or use a dedicated config key.
     */
    {
      provide: PAYMENT_PROVIDER_TOKEN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): StripePaymentProvider | MockPaymentProvider => {
        const env = config.get<string>('app.nodeEnv') ?? 'development';
        return env === 'production'
          ? new StripePaymentProvider(config)
          : new MockPaymentProvider();
      },
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
