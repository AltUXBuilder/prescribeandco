<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\Questionnaire;
use App\Models\QuestionnaireResponse;
use Ramsey\Uuid\Uuid;

class QuestionnaireService
{
    public function __construct(
        private QuestionnaireValidator $validator,
        private AuditService           $audit,
    ) {}

    public function create(array $data, string $createdBy): Questionnaire
    {
        $this->assertUniqueQuestionIds($data['questions']);

        $q = Questionnaire::create([
            'id'          => Uuid::uuid4()->toString(),
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'schema'      => ['version' => 1, 'questions' => $data['questions']],
            'version'     => 1,
            'is_active'   => true,
            'created_by'  => $createdBy,
        ]);

        $this->audit->log($createdBy, AuditAction::QUESTIONNAIRE_CREATED, 'Questionnaire', $q->id,
            null, ['title' => $q->title]);

        return $q;
    }

    public function update(string $id, array $data, string $adminId): Questionnaire
    {
        $q      = $this->findById($id);
        $before = ['version' => $q->version, 'title' => $q->title];

        $schemaChanged = !empty($data['questions']);
        if ($schemaChanged) {
            $this->assertUniqueQuestionIds($data['questions']);
        }

        $q->update(array_filter([
            'title'       => $data['title'] ?? null,
            'description' => $data['description'] ?? null,
            'schema'      => $schemaChanged
                ? ['version' => $q->version + 1, 'questions' => $data['questions']]
                : null,
            'version'     => $schemaChanged ? $q->version + 1 : null,
        ], fn($v) => $v !== null));

        $this->audit->log($adminId, AuditAction::QUESTIONNAIRE_UPDATED, 'Questionnaire', $id,
            $before, ['version' => $q->fresh()->version, 'schema_changed' => $schemaChanged]);

        return $q->fresh();
    }

    public function deactivate(string $id, string $adminId): void
    {
        $q = $this->findById($id);
        $q->update(['is_active' => false]);
        $this->audit->log($adminId, AuditAction::QUESTIONNAIRE_DEACTIVATED, 'Questionnaire', $id);
    }

    public function submitResponse(string $questionnaireId, string $userId, array $answers): array
    {
        $q = $this->findById($questionnaireId);

        if (!$q->is_active) {
            abort(400, 'This questionnaire is no longer active');
        }

        $result = $this->validator->validate($q->schema, $answers);

        $response = QuestionnaireResponse::create([
            'id'                      => Uuid::uuid4()->toString(),
            'user_id'                 => $userId,
            'questionnaire_id'        => $questionnaireId,
            'questionnaire_version'   => $q->version,
            'answers'                 => $answers,
            'is_eligible'             => $result['is_eligible'],
            'ineligibility_reasons'   => $result['ineligibility_reasons'] ?: null,
            'submitted_at'            => now(),
        ]);

        $this->audit->log($userId, AuditAction::QUESTIONNAIRE_RESPONSE_SUBMITTED,
            'QuestionnaireResponse', $response->id, null,
            ['questionnaire_id' => $questionnaireId, 'is_eligible' => $result['is_eligible']]);

        return [
            'id'                    => $response->id,
            'questionnaire_id'      => $questionnaireId,
            'questionnaire_version' => $q->version,
            'is_eligible'           => $result['is_eligible'],
            'ineligibility_reasons' => $result['ineligibility_reasons'],
            'submitted_at'          => $response->submitted_at,
        ];
    }

    public function findById(string $id): Questionnaire
    {
        return Questionnaire::findOrFail($id);
    }

    public function findAll(): \Illuminate\Support\Collection
    {
        return Questionnaire::orderByDesc('created_at')->get();
    }

    public function findActive(): \Illuminate\Support\Collection
    {
        return Questionnaire::where('is_active', true)->orderBy('title')->get();
    }

    public function findResponseById(string $id): QuestionnaireResponse
    {
        return QuestionnaireResponse::findOrFail($id);
    }

    private function assertUniqueQuestionIds(array $questions): void
    {
        $ids = array_column($questions, 'id');
        if (count($ids) !== count(array_unique($ids))) {
            abort(400, 'Questionnaire contains duplicate question IDs');
        }
    }
}
