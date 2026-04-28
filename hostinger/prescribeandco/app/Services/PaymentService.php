<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

class PaymentService
{
    public function __construct(
        private StripePaymentProvider $stripe,
        private AuditService          $audit,
    ) {}

    // ── Authorise ──────────────────────────────────────────────────────────────

    public function authorise(
        string        $prescriptionId,
        string        $customerId,
        string        $productName,
        int           $amountPence,
        array         $paymentData,
    ): Payment {
        // Enforce one active payment per prescription
        $existing = Payment::where('prescription_request_id', $prescriptionId)
            ->whereNotIn('status', [PaymentStatus::FAILED->value, PaymentStatus::VOIDED->value])
            ->first();

        if ($existing) {
            abort(409, 'Payment already exists for this prescription');
        }

        $method = PaymentMethod::from($paymentData['payment_method']);
        $id     = Uuid::uuid4()->toString();

        $payment = Payment::create([
            'id'                       => $id,
            'prescription_request_id'  => $prescriptionId,
            'payment_method'           => $method,
            'status'                   => PaymentStatus::PENDING,
            'amount_pence'             => $amountPence,
            'currency'                 => 'GBP',
            'refunded_amount_pence'    => 0,
            'payment_method_token'     => $paymentData['payment_method_token'] ?? null,
            'idempotency_key'          => $id,
        ]);

        // NHS / EXEMPT — no provider call required
        if (in_array($method, [PaymentMethod::NHS_VOUCHER, PaymentMethod::EXEMPT])) {
            $payment->update([
                'status'      => PaymentStatus::CAPTURED,
                'captured_at' => now(),
            ]);
            $this->audit->log($customerId, AuditAction::PAYMENT_CAPTURED, 'Payment', $id,
                null, ['method' => $method->value, 'amount' => $amountPence]);
            return $payment->fresh();
        }

        // CARD — call Stripe
        $result = $this->stripe->authorise(
            amountPence:        $amountPence,
            currency:           'GBP',
            paymentMethodToken: $paymentData['payment_method_token'],
            metadata: [
                'prescription_id' => $prescriptionId,
                'customer_id'     => $customerId,
                'product_name'    => $productName,
            ],
            idempotencyKey: $id,
            returnUrl: config('services.stripe.return_url'),
        );

        if ($result['success']) {
            $payment->update([
                'status'             => PaymentStatus::CAPTURED,
                'provider_payment_id'=> $result['provider_payment_id'],
                'provider_charge_id' => $result['provider_charge_id'],
                'raw_provider_response' => $result['raw_response'],
                'captured_at'        => now(),
            ]);
            $this->audit->log($customerId, AuditAction::PAYMENT_CAPTURED, 'Payment', $id);
        } else {
            $payment->update([
                'status'          => PaymentStatus::FAILED,
                'failure_code'    => $result['error_code'],
                'failure_message' => $result['error_message'],
                'raw_provider_response' => $result['raw_response'] ?? null,
            ]);
            $this->audit->log($customerId, AuditAction::PAYMENT_FAILED, 'Payment', $id,
                null, null, ['code' => $result['error_code']]);
        }

        return $payment->fresh();
    }

    // ── Refund ─────────────────────────────────────────────────────────────────

    public function refund(string $paymentId, ?int $amountPence, string $reason, string $actorId): Payment
    {
        $payment = Payment::findOrFail($paymentId);

        if (!$payment->is_refundable) {
            abort(400, "Payment status {$payment->status->value} is not refundable");
        }

        $refundAmount = $amountPence ?? $payment->net_amount_pence;

        if ($payment->payment_method !== PaymentMethod::CARD) {
            $payment->update([
                'status'                => PaymentStatus::REFUNDED,
                'refunded_amount_pence' => $payment->refunded_amount_pence + $refundAmount,
                'refunded_at'           => now(),
            ]);
        } else {
            $result = $this->stripe->refund(
                providerChargeId: $payment->provider_charge_id,
                amountPence:      $refundAmount,
                reason:           $reason,
                idempotencyKey:   $payment->id . '_' . time(),
            );

            if (!$result['success']) {
                abort(500, "Refund failed: {$result['error_message']}");
            }

            $newTotal = $payment->refunded_amount_pence + $refundAmount;
            $newStatus = $newTotal >= $payment->amount_pence
                ? PaymentStatus::REFUNDED
                : PaymentStatus::PARTIALLY_REFUNDED;

            $payment->update([
                'status'                => $newStatus,
                'refunded_amount_pence' => $newTotal,
                'provider_refund_id'    => $result['provider_refund_id'],
                'refunded_at'           => now(),
            ]);
        }

        $this->audit->log($actorId, AuditAction::PAYMENT_REFUNDED, 'Payment', $paymentId,
            null, ['amount' => $refundAmount, 'reason' => $reason]);

        return $payment->fresh();
    }

    /**
     * Called by PrescriberService::reject().
     * Non-fatal — errors are logged but never rethrown so rejection is never blocked.
     */
    public function refundOnRejection(string $prescriptionId, string $reason): void
    {
        try {
            $payment = Payment::where('prescription_request_id', $prescriptionId)
                ->where('status', PaymentStatus::CAPTURED->value)
                ->first();

            if (!$payment) return;

            $this->refund($payment->id, null, $reason, 'system');
        } catch (\Throwable $e) {
            Log::error("Auto-refund on rejection failed for prescription {$prescriptionId}: " . $e->getMessage());
        }
    }

    public function findByPrescription(string $prescriptionId): ?Payment
    {
        return Payment::where('prescription_request_id', $prescriptionId)->first();
    }

    public function findById(string $id): Payment
    {
        return Payment::findOrFail($id);
    }
}
