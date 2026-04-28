<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class WebRequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $userRole = $request->session()->get('user_role');

        if (!$userRole || !in_array($userRole, $roles, true)) {
            abort(403, 'You do not have permission to access this page.');
        }

        return $next($request);
    }
}
