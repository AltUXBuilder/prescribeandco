<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\PrescriptionStatus;
use App\Models\PrescriptionRequest;
use Carbon\Carbon;

class DispenserService
{
    public function __construct(
        private PrescriptionStateMachine $stateMachine,
        private AuditService             $audit,
    ) {}

    public function getQueue(string $dispenserId, array $query): array
    {
        $status = $query['status'] ?? PrescriptionStatus::APPROVED->value;
        $page   = (int) ($query['page'] ?? 1);
        $limit  = (int) ($query['limit'] ?? 20);

        $q = PrescriptionRequest::with(['customer', 'product'])
            ->where('status', $status);

        if ($status === PrescriptionStatus::DISPENSING->value) {
            $q->where('dispenser_id', $dispenserId);
        }

        $q->orderBy('approved_at');

        $total = $q->count();
        $items = $q->offset(($page - 1) * $limit)->limit($limit)->get();

        return compact('items', 'total', 'page', 'limit') + ['total_pages' => (int) ceil($total / $limit)];
    }

    public function getDetail(string $prescriptionId, string $dispenserId): PrescriptionRequest
    {
        $p = PrescriptionRequest::with(['customer', 'product'])->findOrFail($prescriptionId);

        $visible = [
            PrescriptionStatus::APPROVED->value,
            PrescriptionStatus::DISPENSING->value,
            PrescriptionStatus::FULFILLED->value,
        ];

        // Return 404 for clinical states the dispenser has no business seeing
        if (!in_array($p->status->value, $visible)) {
            abort(404);
        }

        if ($p->status === PrescriptionStatus::DISPENSING && $p->dispenser_id !== $dispenserId) {
            abort(404);
        }

        return $p;
    }

    public function claim(string $prescriptionId, string $dispenserId, ?string $note): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        // Idempotent
        if ($p->status === PrescriptionStatus::DISPENSING && $p->dispenser_id === $dispenserId) {
            return $p;
        }

        if ($p->status !== PrescriptionStatus::APPROVED) {
            abort(400, "Cannot claim prescription in status {$p->status->value}");
        }

        $this->stateMachine->assertTransition($p->status, PrescriptionStatus::DISPENSING, $prescriptionId);

        $p->update([
            'status'               => PrescriptionStatus::DISPENSING,
            'dispenser_id'         => $dispenserId,
            'dispensing_started_at'=> now(),
            'prescriber_note'      => $note,
        ]);

        $this->audit->log($dispenserId, AuditAction::DISPENSING_STARTED, 'PrescriptionRequest', $prescriptionId,
            null, null, ['note' => $note], 'DISPENSER');

        return $p->fresh();
    }

    public function updateTracking(string $prescriptionId, string $dispenserId, array $data): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        if ($p->status !== PrescriptionStatus::DISPENSING || $p->dispenser_id !== $dispenserId) {
            abort(403, 'You do not have access to update this prescription');
        }

        $p->update(array_filter([
            'tracking_number' => $data['tracking_number'] ?? null,
            'courier_name'    => $data['courier_name'] ?? null,
        ], fn($v) => $v !== null));

        $this->audit->log($dispenserId, AuditAction::DISPENSING_TRACKING_UPDATED, 'PrescriptionRequest', $prescriptionId,
            null, null, ['tracking' => $data['tracking_number'] ?? null, 'courier' => $data['courier_name'] ?? null]);

        return $p->fresh();
    }

    public function markFulfilled(string $prescriptionId, string $dispenserId, array $data): PrescriptionRequest
    {
        $p = PrescriptionRequest::findOrFail($prescriptionId);

        if ($p->status !== PrescriptionStatus::DISPENSING || $p->dispenser_id !== $dispenserId) {
            abort(403, 'You do not have access to fulfil this prescription');
        }

        // Guard: cannot ship an expired prescription
        if ($p->expiry_date && Carbon::parse($p->expiry_date)->isPast()) {
            abort(400, 'Prescription has expired and cannot be fulfilled');
        }

        $this->stateMachine->assertTransition($p->status, PrescriptionStatus::FULFILLED, $prescriptionId);

        $p->update([
            'status'          => PrescriptionStatus::FULFILLED,
            'tracking_number' => $data['tracking_number'],
            'courier_name'    => $data['courier_name'],
            'fulfilled_at'    => now(),
            'prescriber_note' => $data['dispensing_note'] ?? $p->prescriber_note,
        ]);

        $this->audit->log($dispenserId, AuditAction::DISPENSING_FULFILLED, 'PrescriptionRequest', $prescriptionId,
            null, null, ['tracking' => $data['tracking_number'], 'courier' => $data['courier_name']], 'DISPENSER');

        return $p->fresh();
    }
}
