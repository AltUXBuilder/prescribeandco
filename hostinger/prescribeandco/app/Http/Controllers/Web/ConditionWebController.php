<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\View\View;

class ConditionWebController extends Controller
{
    public function show(string $slug): View
    {
        $condition = config("conditions.{$slug}");

        if (!$condition) {
            abort(404);
        }

        $category = Category::where('slug', $slug)->with('children')->first();

        $categoryIds = $category
            ? collect([$category->id])->merge($category->children->pluck('id'))->all()
            : [];

        $products = Product::where('status', 'ACTIVE')
            ->when(!empty($categoryIds),
                fn($q) => $q->whereIn('category_id', $categoryIds),
                fn($q) => $q->whereRaw('0 = 1')
            )
            ->with('category')
            ->orderBy('name')
            ->paginate(12);

        return view('conditions.show', compact('condition', 'products'));
    }
}
