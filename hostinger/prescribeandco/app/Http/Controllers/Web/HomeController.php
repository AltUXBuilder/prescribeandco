<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use Illuminate\View\View;

class HomeController extends Controller
{
    public function index(): View
    {
        $categories = Category::whereNull('parent_id')
            ->with(['children'])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        $featuredProducts = Product::where('status', 'ACTIVE')
            ->with('category')
            ->limit(6)
            ->get();

        return view('home', compact('categories', 'featuredProducts'));
    }
}
