<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuditAction;
use App\Http\Controllers\Controller;
use App\Models\Questionnaire;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class QuestionnaireWebController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(): View
    {
        $query = Questionnaire::with('creator')->orderByDesc('created_at');

        // Prescribers only see questionnaires they created
        if (session('user_role') === 'PRESCRIBER') {
            $query->where('created_by', session('user_id'));
        }

        $questionnaires = $query->paginate(25);
        return view('questionnaires.index', compact('questionnaires'));
    }

    public function create(): View
    {
        return view('questionnaires.form', ['questionnaire' => null]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:200',
            'description' => 'nullable|string|max:1000',
            'schema_json' => 'required|string',
        ]);

        $schema = json_decode($data['schema_json'], true);

        if (!$schema || !isset($schema['questions'])) {
            return back()->withErrors(['schema_json' => 'Invalid question schema.'])->withInput();
        }

        $questionnaire = Questionnaire::create([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'schema'      => $schema,
            'created_by'  => session('user_id'),
            'is_active'   => true,
        ]);

        $this->audit->log(session('user_id'), AuditAction::QUESTIONNAIRE_CREATED, 'questionnaires',
            $questionnaire->id, null, ['title' => $questionnaire->title], null, session('user_role'));

        $back = session('user_role') === 'PRESCRIBER' ? 'prescriber.questionnaires' : 'admin.questionnaires';
        return redirect()->route($back)->with('success', 'Questionnaire "' . $questionnaire->title . '" created.');
    }

    public function edit(string $id): View
    {
        $questionnaire = $this->findOwned($id);
        return view('questionnaires.form', compact('questionnaire'));
    }

    public function update(Request $request, string $id): RedirectResponse
    {
        $questionnaire = $this->findOwned($id);

        $data = $request->validate([
            'title'       => 'required|string|max:200',
            'description' => 'nullable|string|max:1000',
            'schema_json' => 'required|string',
        ]);

        $schema = json_decode($data['schema_json'], true);

        if (!$schema || !isset($schema['questions'])) {
            return back()->withErrors(['schema_json' => 'Invalid question schema.'])->withInput();
        }

        $questionnaire->update([
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'schema'      => $schema,
            'version'     => $questionnaire->version + 1,
        ]);

        $this->audit->log(session('user_id'), AuditAction::QUESTIONNAIRE_UPDATED, 'questionnaires',
            $id, null, ['title' => $questionnaire->title, 'version' => $questionnaire->version], null, session('user_role'));

        $back = session('user_role') === 'PRESCRIBER' ? 'prescriber.questionnaires' : 'admin.questionnaires';
        return redirect()->route($back)->with('success', "Questionnaire updated.");
    }

    public function toggleActive(string $id): RedirectResponse
    {
        // Admin only — middleware enforces this via route registration
        $questionnaire = Questionnaire::findOrFail($id);
        $questionnaire->update(['is_active' => !$questionnaire->is_active]);

        $this->audit->log(session('user_id'), AuditAction::QUESTIONNAIRE_DEACTIVATED, 'questionnaires', $id,
            null, ['is_active' => $questionnaire->is_active]);

        return back()->with('success', 'Questionnaire ' . ($questionnaire->is_active ? 'activated' : 'deactivated') . '.');
    }

    private function findOwned(string $id): Questionnaire
    {
        $query = Questionnaire::query();
        if (session('user_role') === 'PRESCRIBER') {
            $query->where('created_by', session('user_id'));
        }
        return $query->findOrFail($id);
    }
}
