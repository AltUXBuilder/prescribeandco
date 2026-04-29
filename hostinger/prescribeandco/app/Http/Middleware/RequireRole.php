<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    /**
     * Usage in routes:  middleware('role:ADMIN')
     *              or:  middleware('role:PRESCRIBER,ADMIN')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->attributes->get('user');

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $allowed = array_map(fn($r) => Role::from($r), $roles);

        if (!in_array($user->role, $allowed)) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
