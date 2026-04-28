<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Category::orderBy('sort_order')->orderBy('name');

        if ($request->has('parentId')) {
            $parentId = $request->query('parentId');
            $query->where('parent_id', $parentId === 'null' ? null : $parentId);
        }

        return response()->json($query->get());
    }

    public function showBySlug(string $slug): JsonResponse
    {
        $category = Category::where('slug', $slug)->first();

        if (!$category) {
            return response()->json(['message' => "Category \"{$slug}\" not found"], 404);
        }

        return response()->json($category);
    }
}
