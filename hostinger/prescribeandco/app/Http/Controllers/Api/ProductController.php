<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function __construct(private ProductService $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->service->findAll($request->query()));
    }

    public function show(string $id): JsonResponse
    {
        return response()->json($this->service->findById($id, withRelations: true));
    }

    public function showBySlug(string $slug): JsonResponse
    {
        return response()->json($this->service->findBySlug($slug));
    }

    public function questionnaire(string $id): JsonResponse
    {
        return response()->json($this->service->getQuestionnaire($id));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'                   => 'required|string|max:200',
            'slug'                   => 'nullable|string|max:220|regex:/^[a-z0-9-]+$/',
            'description'            => 'nullable|string',
            'bnf_code'               => 'nullable|string|max:20',
            'medicine_type'          => 'required|in:POM,P,GSL',
            'requires_prescription'  => 'required|boolean',
            'requires_questionnaire' => 'nullable|boolean',
            'questionnaire_id'       => 'nullable|uuid',
            'category_id'            => 'nullable|uuid',
            'price_pence'            => 'required|integer|min:1|max:99999999',
            'stock_count'            => 'nullable|integer|min:0',
        ]);

        $user    = $request->attributes->get('user');
        $product = $this->service->create($request->validated(), $user->id);

        return response()->json($product, 201);
    }

    public function update(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'name'                   => 'nullable|string|max:200',
            'slug'                   => 'nullable|string|max:220|regex:/^[a-z0-9-]+$/',
            'description'            => 'nullable|string',
            'medicine_type'          => 'nullable|in:POM,P,GSL',
            'requires_prescription'  => 'nullable|boolean',
            'requires_questionnaire' => 'nullable|boolean',
            'questionnaire_id'       => 'nullable|uuid',
            'category_id'            => 'nullable|uuid',
            'price_pence'            => 'nullable|integer|min:1|max:99999999',
            'stock_count'            => 'nullable|integer|min:0',
            'status'                 => 'nullable|in:ACTIVE,INACTIVE,ARCHIVED',
        ]);

        $user    = $request->attributes->get('user');
        $product = $this->service->update($id, $request->validated(), $user->id);

        return response()->json($product);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');
        $this->service->archive($id, $user->id);

        return response()->json(['message' => 'Product archived']);
    }
}
