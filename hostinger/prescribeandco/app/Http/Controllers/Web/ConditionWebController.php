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
        $category = Category::where('slug', $slug)
            ->with(['children', 'parent'])
            ->firstOrFail();

        $ids = collect([$category->id])
            ->merge($category->children->pluck('id'));

        $products = Product::where('status', 'ACTIVE')
            ->whereIn('category_id', $ids)
            ->with('category')
            ->orderBy('name')
            ->paginate(12);

        return view('conditions.show', compact('category', 'products'));
    }
}
