<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Enums\ProductStatus;
use App\Models\PrescriptionRequest;
use App\Models\QuestionnaireResponse;
use Ramsey\Uuid\Uuid;

class PrescriptionService
{
    public function __construct(
        private ProductService             $products,
        private QuestionnaireService       $questionnaires,
        private DocumentService            $documents,
        private PaymentService             $payments,
        private PrescriptionStateMachine   $stateMachine,
        private EligibilityCalculator      $eligibility,
        private AuditService               $audit,
    ) {}

    // ── Step 1: Create DRAFT ───────────────────────────────────────────────────

    public function createDraft(string $customerId, array $data): PrescriptionRequest
    {
        $product = $this->products->findById($data['product_id']);

        if ($product->status !== ProductStatus::ACTIVE) {
            abort(400, "Product \"{$product->name}\" is not currently available");
        }
        if (!$product->requires_prescription) {
            abort(400, "Product \"{$product->name}\" does not require a prescription request");
        }

        $this->assertNoDuplicateOpenRequest($customerId, $data['product_id']);

        $prescription = PrescriptionRequest::create([
            'id'                  => Uuid::uuid4()->toString(),
            'customer_id'         => $customerId,
            'product_id'          => $data['product_id'],
            'delivery_address_id' => $data['delivery_address_id'] ?? null,
            'customer_note'       => $data['customer_note'] ?? null,
            'status'              => PrescriptionStatus::DRAFT,
        ]);

        $this->audit->log($customerId, AuditAction::PRESCRIPTION_DRAFT_CREATED, 'PrescriptionRequest', $prescription->id,
            null, ['product_id' => $data['product_id']]);

        return $prescription;
    }

    // ── Step 2: Attach questionnaire response ──────────────────────────────────

    public function attachQuestionnaireResponse(
        string $prescriptionId,
        string $customerId,
        string $responseId,
    ): PrescriptionRequest {
        $prescription = $this->findOwnedDraft($prescriptionId, $customerId);
        $product      = $this->products->findById($prescription->product_id);

        if (!$product->requires_questionnaire) {
            abort(400, "Product \"{$product->name}\" does not require a questionnaire");
        }

        $response = $this->questionnaires->findResponseById($responseId);

        if ($response->user_id !== $customerId) {
            abort(403, 'You can only attach your own questionnaire responses');
        }
        if ($response->questionnaire_id !== $product->questionnaire_id) {
            abort(400, 'This questionnaire response is for a different product questionnaire');
        }

        $prescription->update(['questionnaire_response_id' => $response->id]);

        $this->audit->log($customerId, AuditAction::QUESTIONNAIRE_ATTACHED, 'PrescriptionRequest', $prescriptionId,
            null, ['response_id' => $responseId]);

        return $prescription->fresh();
    }

    // ── Step 3: Submit (DRAFT → SUBMITTED) ────────────────────────────────────

    public function submit(string $prescriptionId, string $customerId, array $data): PrescriptionRequest
    {
        $prescription = $this->findOwnedDraft($prescriptionId, $customerId);

        if (!empty($data['delivery_address_id'])) {
            $prescription->delivery_address_id = $data['delivery_address_id'];
        }
        if (array_key_exists('customer_note', $data)) {
            $prescription->customer_note = $data['customer_note'];
        }

        if (!$prescription->delivery_address_id) {
            abort(400, 'A delivery address must be set before submitting');
        }

        $product = $this->products->findById($prescription->product_id);

        if ($product->requires_questionnaire && !$prescription->questionnaire_response_id) {
            abort(400, "Product \"{$product->name}\" requires a completed questionnaire before submitting");
        }

        $this->documents->assertAllDocumentsClean($prescriptionId);

        // Compute eligibility from the questionnaire response
        $response = null;
        if ($prescription->questionnaire_response_id) {
            $response = $this->questionnaires->findResponseById($prescription->questionnaire_response_id);
        }
        $elig = $this->eligibility->calculate($response);

        if ($elig) {
            $prescription->eligibility_status = $elig['status'];
            $prescription->eligibility_notes  = count($elig['notes']) > 0 ? $elig['notes'] : null;
        }

        $this->stateMachine->assertTransition($prescription->status, PrescriptionStatus::SUBMITTED, $prescriptionId);
        $prescription->status       = PrescriptionStatus::SUBMITTED;
        $prescription->submitted_at = now();
        $prescription->save();

        // Authorise payment after the status flip — if payment fails, roll back to DRAFT
        if (!empty($data['payment'])) {
            $paymentResult = $this->payments->authorise(
                $prescriptionId, $customerId, $product->name, $product->price_pence, $data['payment']
            );

            if ($paymentResult->status === \App\Enums\PaymentStatus::FAILED) {
                $prescription->status       = PrescriptionStatus::DRAFT;
                $prescription->submitted_at = null;
                $prescription->save();
                abort(400, "Payment failed: {$paymentResult->failure_message}. Please check your payment details.");
            }
        }

        $this->audit->log($customerId, AuditAction::PRESCRIPTION_SUBMITTED, 'PrescriptionRequest', $prescriptionId,
            null, ['eligibility' => $elig['status']->value ?? null]);

        return $prescription->fresh();
    }

    // ── Cancel ─────────────────────────────────────────────────────────────────

    public function cancel(string $prescriptionId, string $customerId, string $reason): PrescriptionRequest
    {
        $prescription = $this->findOwnedPrescription($prescriptionId, $customerId);
        $this->stateMachine->assertTransition($prescription->status, PrescriptionStatus::CANCELLED, $prescriptionId);

        $prescription->update([
            'status'           => PrescriptionStatus::CANCELLED,
            'rejection_reason' => $reason,
            'cancelled_at'     => now(),
        ]);

        $this->audit->log($customerId, AuditAction::PRESCRIPTION_CANCELLED, 'PrescriptionRequest', $prescriptionId,
            null, null, ['reason' => $reason]);

        return $prescription->fresh();
    }

    // ── Read ───────────────────────────────────────────────────────────────────

    public function findMyPrescriptions(string $customerId, array $query): array
    {
        $page  = (int) ($query['page'] ?? 1);
        $limit = (int) ($query['limit'] ?? 20);

        $q = PrescriptionRequest::where('customer_id', $customerId)
            ->with('documents')
            ->orderByDesc('created_at');

        if (!empty($query['status'])) {
            $q->where('status', $query['status']);
        }

        $total = $q->count();
        $data  = $q->offset(($page - 1) * $limit)->limit($limit)->get();

        return [
            'data'        => $data,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    public function findMyPrescriptionById(string $id, string $customerId): PrescriptionRequest
    {
        $p = PrescriptionRequest::with(['product', 'documents', 'questionnaireResponse'])
            ->find($id);

        if (!$p || $p->customer_id !== $customerId) {
            abort(404, "Prescription request {$id} not found");
        }

        return $p;
    }

    public function findById(string $id): PrescriptionRequest
    {
        return PrescriptionRequest::findOrFail($id);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function findOwnedDraft(string $id, string $customerId): PrescriptionRequest
    {
        $p = $this->findOwnedPrescription($id, $customerId);
        if (!$p->is_editable) {
            abort(400, "Prescription {$id} is in status \"{$p->status->value}\" and can no longer be edited");
        }
        return $p;
    }

    private function findOwnedPrescription(string $id, string $customerId): PrescriptionRequest
    {
        $p = PrescriptionRequest::find($id);

        if (!$p || $p->customer_id !== $customerId) {
            // Return 404 — never 403 — to avoid leaking existence of other users' records
            abort(404, "Prescription request {$id} not found");
        }

        return $p;
    }

    private function assertNoDuplicateOpenRequest(string $customerId, string $productId): void
    {
        $openStatuses = [
            PrescriptionStatus::DRAFT, PrescriptionStatus::SUBMITTED,
            PrescriptionStatus::UNDER_REVIEW, PrescriptionStatus::APPROVED,
        ];

        foreach ($openStatuses as $status) {
            $exists = PrescriptionRequest::where('customer_id', $customerId)
                ->where('product_id', $productId)
                ->where('status', $status->value)
                ->exists();

            if ($exists) {
                abort(400, "You already have an open prescription request for this product (status: {$status->value})");
            }
        }
    }
}
