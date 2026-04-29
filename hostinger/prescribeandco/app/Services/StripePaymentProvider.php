<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Stripe\Exception\ApiErrorException;
use Stripe\StripeClient;

class StripePaymentProvider
{
    private StripeClient $stripe;

    public function __construct()
    {
        $this->stripe = new StripeClient(config('services.stripe.secret'));
    }

    public function authorise(
        int    $amountPence,
        string $currency,
        string $paymentMethodToken,
        array  $metadata,
        string $idempotencyKey,
        string $returnUrl,
    ): array {
        try {
            $intent = $this->stripe->paymentIntents->create([
                'amount'         => $amountPence,
                'currency'       => strtolower($currency),
                'payment_method' => $paymentMethodToken,
                'capture_method' => 'automatic',
                'confirm'        => true,
                'metadata'       => $metadata,
                'return_url'     => $returnUrl,
            ], ['idempotency_key' => "auth_{$idempotencyKey}"]);

            $succeeded = $intent->status === 'succeeded';

            return [
                'success'            => $succeeded,
                'provider_payment_id'=> $intent->id,
                'provider_charge_id' => is_string($intent->latest_charge) ? $intent->latest_charge : null,
                'raw_response'       => $intent->toArray(),
                'error_code'         => $succeeded ? null : ($intent->last_payment_error?->code ?? null),
                'error_message'      => $succeeded ? null : ($intent->last_payment_error?->message ?? null),
            ];
        } catch (ApiErrorException $e) {
            return $this->handleError('authorise', $e);
        }
    }

    public function refund(
        string  $providerChargeId,
        int     $amountPence,
        string  $reason,
        string  $idempotencyKey,
    ): array {
        try {
            $refund = $this->stripe->refunds->create([
                'charge' => $providerChargeId,
                'amount' => $amountPence,
                'reason' => 'requested_by_customer',
                'metadata' => ['reason' => $reason],
            ], ['idempotency_key' => "refund_{$idempotencyKey}"]);

            $succeeded = $refund->status === 'succeeded';

            return [
                'success'          => $succeeded,
                'provider_refund_id'=> $refund->id,
                'raw_response'     => $refund->toArray(),
                'error_code'       => $succeeded ? null : ($refund->failure_reason ?? null),
                'error_message'    => $succeeded ? null : "Refund status: {$refund->status}",
            ];
        } catch (ApiErrorException $e) {
            return $this->handleError('refund', $e);
        }
    }

    /**
     * Verify a Stripe webhook signature.
     * Uses HMAC-SHA256 with 5-minute timestamp tolerance to prevent replay attacks.
     */
    public function verifyWebhook(string $rawBody, string $signatureHeader, string $secret): bool
    {
        // Signature header format: t=timestamp,v1=hash
        $parts = [];
        foreach (explode(',', $signatureHeader) as $part) {
            [$key, $val] = explode('=', $part, 2);
            $parts[$key] = $val;
        }

        if (empty($parts['t']) || empty($parts['v1'])) return false;

        $timestamp = (int) $parts['t'];
        if (abs(time() - $timestamp) > 300) return false; // 5-minute tolerance

        $expected = hash_hmac('sha256', "{$timestamp}.{$rawBody}", $secret);

        // Constant-time comparison prevents timing attacks
        return hash_equals($expected, $parts['v1']);
    }

    private function handleError(string $op, ApiErrorException $e): array
    {
        Log::warning("Stripe {$op} error: [{$e->getStripeCode()}] {$e->getMessage()}");

        return [
            'success'       => false,
            'error_code'    => $e->getStripeCode() ?? 'stripe_error',
            'error_message' => $e->getMessage(),
            'raw_response'  => ['type' => $e->getError()?->type, 'code' => $e->getStripeCode()],
        ];
    }
}
