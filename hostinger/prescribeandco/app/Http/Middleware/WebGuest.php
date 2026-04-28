<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebGuest
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->session()->has('user_id')) {
            $redirect = match ($request->session()->get('user_role')) {
                'ADMIN'      => route('admin.index'),
                'PRESCRIBER' => route('prescriber.queue'),
                'DISPENSER'  => route('dispenser.queue'),
                default      => route('dashboard'),
            };
            return redirect($redirect);
        }

        return $next($request);
    }
}
