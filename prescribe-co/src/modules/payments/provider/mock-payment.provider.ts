import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  AuthorisePaymentParams,
  AuthoriseResult,
  CapturePaymentParams,
  CaptureResult,
  IPaymentProvider,
  RefundPaymentParams,
  RefundResult,
  VoidPaymentParams,
  VoidResult,
} from './payment-provider.interface';

/**
 * MockPaymentProvider
 * ───────────────────
 * Used in test / development environments.
 * Simulates realistic provider responses without network calls.
 *
 * Failure simulation:
 *   - paymentMethodToken = 'tok_fail'    → authorise returns failure
 *   - paymentMethodToken = 'tok_decline' → authorise returns card_declined
 *
 * Register in AppModule when NODE_ENV !== 'production':
 *   { provide: PAYMENT_PROVIDER_TOKEN, useClass: MockPaymentProvider }
 */
@Injectable()
export class MockPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(MockPaymentProvider.name);

  async authorise(params: AuthorisePaymentParams): Promise<AuthoriseResult> {
    this.logger.debug(`[MOCK] authorise £${params.amountPence / 100} for prescription ${params.metadata.prescriptionId}`);

    if (params.paymentMethodToken === 'tok_fail') {
      return {
        success: false,
        providerPaymentId: '',
        providerReference: null,
        errorCode: 'payment_failed',
        errorMessage: 'Mock: payment method declined',
        rawResponse: { mock: true, reason: 'forced_failure' },
      };
    }

    if (params.paymentMethodToken === 'tok_decline') {
      return {
        success: false,
        providerPaymentId: '',
        providerReference: null,
        errorCode: 'card_declined',
        errorMessage: 'Mock: card declined',
        rawResponse: { mock: true, reason: 'card_declined' },
      };
    }

    const paymentId = `mock_pi_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    const chargeId  = `mock_ch_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    return {
      success: true,
      providerPaymentId: paymentId,
      providerReference: chargeId,
      rawResponse: { mock: true, id: paymentId, status: 'succeeded', latest_charge: chargeId },
    };
  }

  async capture(params: CapturePaymentParams): Promise<CaptureResult> {
    this.logger.debug(`[MOCK] capture ${params.providerPaymentId}`);
    const chargeId = `mock_ch_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    return {
      success: true,
      providerChargeId: chargeId,
      rawResponse: { mock: true, id: chargeId, status: 'succeeded' },
    };
  }

  async void(params: VoidPaymentParams): Promise<VoidResult> {
    this.logger.debug(`[MOCK] void ${params.providerPaymentId}`);
    return {
      success: true,
      rawResponse: { mock: true, id: params.providerPaymentId, status: 'canceled' },
    };
  }

  async refund(params: RefundPaymentParams): Promise<RefundResult> {
    this.logger.debug(`[MOCK] refund ${params.providerChargeId} £${params.amountPence / 100}`);
    const refundId = `mock_re_${uuidv4().replace(/-/g, '').slice(0, 24)}`;
    return {
      success: true,
      providerRefundId: refundId,
      rawResponse: { mock: true, id: refundId, status: 'succeeded' },
    };
  }
}
