<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\View\View;

class HomeController extends Controller
{
    public function index(): View
    {
        $conditions = array_values(config('conditions'));

        $featuredProducts = Product::where('status', 'ACTIVE')
            ->with('category')
            ->limit(6)
            ->get();

        return view('home', compact('conditions', 'featuredProducts'));
    }
}
