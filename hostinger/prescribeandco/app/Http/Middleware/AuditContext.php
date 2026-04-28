<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stores the request IP and User-Agent on the request attributes so
 * AuditService can read them without being passed as parameters.
 */
class AuditContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('audit_ip',         $request->ip());
        $request->attributes->set('audit_user_agent', $request->userAgent() ?? '');

        return $next($request);
    }
}
