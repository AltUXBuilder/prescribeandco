<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QuestionnaireService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestionnaireController extends Controller
{
    public function __construct(private QuestionnaireService $service) {}

    public function index(): JsonResponse
    {
        return response()->json($this->service->findAll());
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->service->findById($id));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title'                     => 'required|string|max:200',
            'description'               => 'nullable|string',
            'questions'                 => 'required|array|min:1',
            'questions.*.id'            => 'required|uuid',
            'questions.*.type'          => 'required|in:TEXT,BOOLEAN,SINGLE_CHOICE,MULTI_CHOICE,SCALE,DATE',
            'questions.*.text'          => 'required|string|max:500',
            'questions.*.isRequired'    => 'nullable|boolean',
            'questions.*.sortOrder'     => 'nullable|integer',
            'questions.*.options'       => 'nullable|array',
            'questions.*.options.*.value'       => 'required|string',
            'questions.*.options.*.label'       => 'required|string',
            'questions.*.options.*.disqualifying' => 'nullable|boolean',
        ]);

        $user = $request->attributes->get('user');
        $q    = $this->service->create($request->validated(), $user->id);

        return response()->json($q, 201);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'title'       => 'nullable|string|max:200',
            'description' => 'nullable|string',
            'questions'   => 'nullable|array',
        ]);

        $user = $request->attributes->get('user');

        return response()->json($this->service->update($id, $request->validated(), $user->id));
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');
        $this->service->deactivate($id, $user->id);

        return response()->json(['message' => 'Questionnaire deactivated']);
    }

    public function respond(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'answers' => 'required|array',
        ]);

        $user   = $request->attributes->get('user');
        $result = $this->service->submitResponse($id, $user->id, $request->input('answers'));

        return response()->json($result, 201);
    }
}
