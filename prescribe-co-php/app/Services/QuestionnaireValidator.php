<?php

namespace App\Services;

use Illuminate\Http\Exceptions\HttpResponseException;

class QuestionnaireValidator
{
    /**
     * Validates customer-submitted answers against the questionnaire schema.
     * Returns [ 'is_eligible' => bool, 'ineligibility_reasons' => string[] ]
     * Throws 422 on structural/type errors.
     */
    public function validate(array $schema, array $answers): array
    {
        $questions            = $schema['questions'] ?? [];
        $ineligibilityReasons = [];
        $errors               = [];

        // Build a map of question IDs → answers for conditional evaluation
        $answerMap = [];
        foreach ($answers as $qid => $value) {
            $answerMap[$qid] = $value;
        }

        foreach ($questions as $q) {
            $qid = $q['id'];

            // Evaluate showIf conditional — skip invisible questions
            if (!empty($q['showIf']) && !$this->evaluateCondition($q['showIf'], $answerMap)) {
                continue;
            }

            $answer  = $answerMap[$qid] ?? null;
            $isBlank = $answer === null || $answer === '' || $answer === [];

            if (!empty($q['isRequired']) && $isBlank) {
                $errors[] = "Question \"{$q['text']}\" is required";
                continue;
            }

            if ($isBlank) continue;

            switch ($q['type']) {
                case 'BOOLEAN':
                    if (!is_bool($answer)) {
                        $errors[] = "Question \"{$q['text']}\" must be true or false";
                    }
                    break;

                case 'SCALE':
                    $bounds = $q['scale'] ?? null;
                    if (!is_numeric($answer) || ($bounds && ($answer < $bounds['min'] || $answer > $bounds['max']))) {
                        $errors[] = "Question \"{$q['text']}\" value out of range";
                    }
                    break;

                case 'SINGLE_CHOICE':
                    $allowed = array_column($q['options'] ?? [], 'value');
                    if (!in_array($answer, $allowed, true)) {
                        $errors[] = "Invalid option for \"{$q['text']}\"";
                        break;
                    }
                    // Check for disqualifying answer
                    foreach ($q['options'] ?? [] as $opt) {
                        if ($opt['value'] === $answer && !empty($opt['disqualifying'])) {
                            $ineligibilityReasons[] = $q['text'] . ': ' . $opt['label'];
                        }
                    }
                    break;

                case 'MULTI_CHOICE':
                    if (!is_array($answer)) {
                        $errors[] = "Question \"{$q['text']}\" expects an array";
                        break;
                    }
                    $allowed = array_column($q['options'] ?? [], 'value');
                    foreach ($answer as $val) {
                        if (!in_array($val, $allowed, true)) {
                            $errors[] = "Invalid option \"{$val}\" for \"{$q['text']}\"";
                        }
                    }
                    foreach ($q['options'] ?? [] as $opt) {
                        if (in_array($opt['value'], $answer, true) && !empty($opt['disqualifying'])) {
                            $ineligibilityReasons[] = $q['text'] . ': ' . $opt['label'];
                        }
                    }
                    break;

                case 'DATE':
                    if (!strtotime((string) $answer)) {
                        $errors[] = "Question \"{$q['text']}\" must be a valid date";
                    }
                    break;
            }
        }

        if (!empty($errors)) {
            throw new HttpResponseException(
                response()->json(['message' => 'Questionnaire validation failed', 'errors' => $errors], 422)
            );
        }

        return [
            'is_eligible'           => empty($ineligibilityReasons),
            'ineligibility_reasons' => $ineligibilityReasons,
        ];
    }

    private function evaluateCondition(array $rule, array $answers): bool
    {
        $actual = $answers[$rule['questionId']] ?? null;
        $value  = $rule['value'];

        return match ($rule['operator']) {
            'eq'     => $actual === $value,
            'neq'    => $actual !== $value,
            'in'     => is_array($value) && in_array($actual, $value, true),
            'not_in' => is_array($value) && !in_array($actual, $value, true),
            default  => true,
        };
    }
}
