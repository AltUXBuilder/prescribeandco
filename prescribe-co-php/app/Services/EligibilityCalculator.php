<?php

namespace App\Services;

use App\Enums\EligibilityStatus;
use App\Models\QuestionnaireResponse;

class EligibilityCalculator
{
    public function calculate(?QuestionnaireResponse $response): ?array
    {
        if ($response === null) return null;

        if (!$response->is_eligible) {
            return [
                'status' => EligibilityStatus::FAIL,
                'notes'  => $response->ineligibility_reasons ?? [],
            ];
        }

        if (!empty($response->ineligibility_reasons)) {
            return [
                'status' => EligibilityStatus::FLAG,
                'notes'  => $response->ineligibility_reasons,
            ];
        }

        return [
            'status' => EligibilityStatus::PASS,
            'notes'  => [],
        ];
    }
}
