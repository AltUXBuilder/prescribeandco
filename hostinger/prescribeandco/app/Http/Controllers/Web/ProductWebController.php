<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ProductWebController extends Controller
{
    public function index(Request $request): View
    {
        $query = Product::where('status', 'ACTIVE')->with('category');

        if ($search = $request->query('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', '%' . $search . '%')
                  ->orWhere('description', 'like', '%' . $search . '%');
            });
        }

        if ($categorySlug = $request->query('category')) {
            $category = Category::where('slug', $categorySlug)->first();
            if ($category) {
                $ids = collect([$category->id])
                    ->merge($category->children->pluck('id'));
                $query->whereIn('category_id', $ids);
            }
        }

        if ($type = $request->query('type')) {
            $query->where('medicine_type', strtoupper($type));
        }

        $products   = $query->orderBy('name')->paginate(12)->withQueryString();
        $categories = Category::whereNull('parent_id')->orderBy('sort_order')->orderBy('name')->get();

        return view('products.index', compact('products', 'categories'));
    }

    public function show(string $slug): View
    {
        $product = Product::where('slug', $slug)
            ->where('status', 'ACTIVE')
            ->with(['category', 'questionnaire'])
            ->firstOrFail();

        $related = Product::where('status', 'ACTIVE')
            ->where('category_id', $product->category_id)
            ->where('id', '!=', $product->id)
            ->limit(3)
            ->get();

        return view('products.show', compact('product', 'related'));
    }
}
