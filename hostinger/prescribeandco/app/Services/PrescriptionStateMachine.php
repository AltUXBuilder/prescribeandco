<?php

namespace App\Services;

use App\Enums\PrescriptionStatus;

class PrescriptionStateMachine
{
    private const TRANSITIONS = [
        'DRAFT'        => ['SUBMITTED', 'CANCELLED'],
        'SUBMITTED'    => ['UNDER_REVIEW', 'CANCELLED'],
        'UNDER_REVIEW' => ['APPROVED', 'REJECTED'],
        'APPROVED'     => ['DISPENSING'],
        'DISPENSING'   => ['FULFILLED'],
    ];

    public function assertTransition(PrescriptionStatus $from, PrescriptionStatus $to, string $id): void
    {
        $allowed = self::TRANSITIONS[$from->value] ?? [];

        if (!in_array($to->value, $allowed)) {
            abort(400, "Cannot transition prescription {$id} from {$from->value} to {$to->value}");
        }
    }

    public function availableTransitions(PrescriptionStatus $from): array
    {
        return self::TRANSITIONS[$from->value] ?? [];
    }
}
