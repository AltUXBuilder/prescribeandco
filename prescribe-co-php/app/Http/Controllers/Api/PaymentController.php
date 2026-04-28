<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use App\Services\StripePaymentProvider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function __construct(
        private PaymentService        $payments,
        private StripePaymentProvider $stripe,
    ) {}

    public function show(string $id): JsonResponse
    {
        return response()->json($this->payments->findById($id));
    }

    public function showByPrescription(string $prescriptionId): JsonResponse
    {
        $payment = $this->payments->findByPrescription($prescriptionId);

        if (!$payment) {
            return response()->json(['message' => 'No payment found for this prescription'], 404);
        }

        return response()->json($payment);
    }

    public function refund(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'amount_pence' => 'nullable|integer|min:1',
            'reason'       => 'required|string|max:500',
        ]);

        $user    = $request->attributes->get('user');
        $payment = $this->payments->refund($id, $request->input('amount_pence'), $request->input('reason'), $user->id);

        return response()->json($payment);
    }

    /**
     * Stripe webhook endpoint. Public — authenticated by signature header.
     */
    public function webhook(Request $request): JsonResponse
    {
        $rawBody   = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature', '');
        $secret    = config('services.stripe.webhook_secret');

        if (!$this->stripe->verifyWebhook($rawBody, $sigHeader, $secret)) {
            return response()->json(['message' => 'Invalid webhook signature'], 400);
        }

        $event = json_decode($rawBody, true);
        if (!$event || !isset($event['type'])) {
            return response()->json(['message' => 'Invalid payload'], 400);
        }

        // Idempotent: log receipt but no further processing needed as
        // payment status is already set synchronously in authorise().
        \Illuminate\Support\Facades\Log::info('Stripe webhook received', ['type' => $event['type']]);

        return response()->json(['received' => true]);
    }
}
