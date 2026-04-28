<?php

namespace App\Services;

class QuestionnaireValidator
{
    /**
     * Validates customer-submitted answers against the questionnaire schema.
     * Returns [ 'is_eligible' => bool, 'ineligibility_reasons' => string[], 'errors' => string[] ]
     * Answers arrive as strings from HTTP form submissions.
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
                    // Forms submit '1' / '0' as strings
                    if (!in_array((string) $answer, ['0', '1'], true)) {
                        $errors[] = "Question \"{$q['text']}\" must be Yes or No";
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

        return [
            'is_eligible'           => empty($ineligibilityReasons) && empty($errors),
            'ineligibility_reasons' => $ineligibilityReasons,
            'errors'                => $errors,
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
