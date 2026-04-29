<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\EligibilityStatus;
use App\Enums\PrescriptionStatus;
use App\Models\PrescriberProfile;
use App\Models\PrescriptionRequest;
use Carbon\Carbon;

class PrescriberService
{
    public function __construct(
        private DocumentService          $documents,
        private PaymentService           $payments,
        private PrescriptionStateMachine $stateMachine,
        private AuditService             $audit,
    ) {}

    public function getQueue(string $prescriberId, array $query): array
    {
        $status = $query['status'] ?? PrescriptionStatus::SUBMITTED->value;
        $page   = (int) ($query['page'] ?? 1);
        $limit  = (int) ($query['limit'] ?? 20);

        $q = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', $status);

        if ($status === PrescriptionStatus::UNDER_REVIEW->value) {
            $q->where('prescriber_id', $prescriberId);
        }
        if (!empty($query['eligibility_status'])) {
            $q->where('eligibility_status', $query['eligibility_status']);
        }

        $q->orderBy('submitted_at');

        $total = $q->count();
        $items = $q->offset(($page - 1) * $limit)->limit($limit)->get();

        return [
            'data'        => $items,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    public function getReviewDetail(string $prescriptionId, string $prescriberId, PrescriberProfile $profile): array
    {
        $p = PrescriptionRequest::with([
            'customer', 'product.questionnaire', 'questionnaireResponse', 'documents',
        ])->findOrFail($prescriptionId);

        $docs = $this->documents->enrichWithPresignedUrls($p->documents);

        $priorCount = PrescriptionRequest::where('customer_id', $p->customer_id)
            ->where('status', PrescriptionStatus::FULFILLED->value)
            ->count();

        $history = $this->audit->getEntityHistory('PrescriptionRequest', $prescriptionId);

        $this->audit->log(
            $prescriberId, AuditAction::PRESCRIPTION_VIEWED, 'PrescriptionRequest', $prescriptionId,
            null, null, null, 'PRESCRIBER', $profile->gphc_number
        );

        return [
            'prescription'    => $p,
            'documents'       => $docs,
            'prior_rx_count'  => $priorCount,
            'audit_history'   => $history,
        ];
    }

    public function claim(string $prescriptionId, string $prescriberId, PrescriberProfile $profile, ?string $note): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        // Idempotent: already claimed by this prescriber
        if ($p->status === PrescriptionStatus::UNDER_REVIEW && $p->prescriber_id === $prescriberId) {
            return $p;
        }

        if ($p->status !== PrescriptionStatus::SUBMITTED) {
            abort(400, "Cannot claim prescription in status {$p->status->value}");
        }

        $this->stateMachine->assertTransition($p->status, PrescriptionStatus::UNDER_REVIEW, $prescriptionId);

        $p->update([
            'status'        => PrescriptionStatus::UNDER_REVIEW,
            'prescriber_id' => $prescriberId,
            'reviewed_at'   => now(),
            'prescriber_note' => $note,
        ]);

        $this->audit->log($prescriberId, AuditAction::PRESCRIPTION_TAKEN_UNDER_REVIEW, 'PrescriptionRequest', $prescriptionId,
            null, null, ['note' => $note], 'PRESCRIBER', $profile->gphc_number);

        return $p->fresh();
    }

    public function approve(string $prescriptionId, string $prescriberId, PrescriberProfile $profile, array $data): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        $this->assertOwnership($p, $prescriberId);

        // Expiry must be in future and within 6 months (UK POM regulation)
        $expiry = Carbon::parse($data['expiry_date']);
        if ($expiry->isPast()) {
            abort(400, 'Expiry date must be in the future');
        }
        if ($expiry->diffInMonths(now()) > 6) {
            abort(400, 'Expiry date cannot be more than 6 months in the future');
        }

        // If eligibility is FAIL, a written justification is mandatory
        if ($p->eligibility_status === EligibilityStatus::FAIL) {
            if (empty($data['eligibility_override_justification']) ||
                strlen($data['eligibility_override_justification']) < 20) {
                abort(400, 'A justification of at least 20 characters is required to override a FAIL eligibility decision');
            }
        }

        $this->stateMachine->assertTransition($p->status, PrescriptionStatus::APPROVED, $prescriptionId);

        $p->update([
            'status'               => PrescriptionStatus::APPROVED,
            'dosage_instructions'  => $data['dosage_instructions'],
            'quantity_dispensed'   => $data['quantity_to_dispense'],
            'expiry_date'          => $expiry->toDateString(),
            'prescribed_date'      => now()->toDateString(),
            'prescriber_note'      => $data['clinical_note'] ?? $p->prescriber_note,
            'approved_at'          => now(),
        ]);

        $this->audit->log($prescriberId, AuditAction::PRESCRIPTION_APPROVED, 'PrescriptionRequest', $prescriptionId,
            ['status' => 'UNDER_REVIEW'], ['status' => 'APPROVED'],
            [
                'dosage'          => $data['dosage_instructions'],
                'expiry'          => $expiry->toDateString(),
                'override_justification' => $data['eligibility_override_justification'] ?? null,
            ],
            'PRESCRIBER', $profile->gphc_number,
        );

        return $p->fresh();
    }

    public function reject(string $prescriptionId, string $prescriberId, PrescriberProfile $profile, array $data): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        $this->assertOwnership($p, $prescriberId);
        $this->stateMachine->assertTransition($p->status, PrescriptionStatus::REJECTED, $prescriptionId);

        $p->update([
            'status'           => PrescriptionStatus::REJECTED,
            'rejection_reason' => $data['reason'],
            'prescriber_note'  => $data['internal_note'] ?? null,
        ]);

        // Trigger refund — non-blocking (does not prevent rejection on failure)
        $this->payments->refundOnRejection($prescriptionId, $data['reason']);

        $this->audit->log($prescriberId, AuditAction::PRESCRIPTION_REJECTED, 'PrescriptionRequest', $prescriptionId,
            ['status' => 'UNDER_REVIEW'], ['status' => 'REJECTED'],
            ['reason' => $data['reason']], 'PRESCRIBER', $profile->gphc_number,
        );

        return $p->fresh();
    }

    public function requestMoreInfo(string $prescriptionId, string $prescriberId, PrescriberProfile $profile, string $info): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);
        $this->assertOwnership($p, $prescriberId);

        if ($p->status !== PrescriptionStatus::UNDER_REVIEW) {
            abort(400, 'Prescription must be UNDER_REVIEW to request more information');
        }

        $timestamp   = now()->toIso8601String();
        $existingNote = $p->prescriber_note ?? '';
        $p->update([
            'prescriber_note' => $existingNote . "\n[{$timestamp}] INFO REQUEST: {$info}",
        ]);

        $this->audit->log($prescriberId, AuditAction::PRESCRIPTION_MORE_INFO, 'PrescriptionRequest', $prescriptionId,
            null, null, ['requested_information' => $info], 'PRESCRIBER', $profile->gphc_number);

        return $p->fresh();
    }

    private function assertOwnership(PrescriptionRequest $p, string $prescriberId): void
    {
        if ($p->prescriber_id !== $prescriberId) {
            abort(403, 'This prescription is assigned to another prescriber');
        }
    }
}
