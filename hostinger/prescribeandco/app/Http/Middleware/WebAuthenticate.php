<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebAuthenticate
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->session()->has('user_id')) {
            $request->session()->put('redirect_url', $request->fullUrl());
            return redirect()->route('login');
        }

        return $next($request);
    }
}
