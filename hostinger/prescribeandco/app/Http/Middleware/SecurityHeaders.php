<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Strict CSP for API responses; permissive-but-safe policy for HTML pages
        $isApi = $request->is('api/*') || $request->expectsJson();

        $csp = $isApi
            ? "default-src 'none'"
            : "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

        $response->headers->set('X-Content-Type-Options',   'nosniff');
        $response->headers->set('X-Frame-Options',           'DENY');
        $response->headers->set('X-XSS-Protection',          '1; mode=block');
        $response->headers->set('Referrer-Policy',           'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy',        'geolocation=(), microphone=(), camera=()');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        $response->headers->set('Content-Security-Policy',   $csp);
        $response->headers->set('Cache-Control',             'no-store, no-cache, must-revalidate, private');
        $response->headers->remove('X-Powered-By');
        $response->headers->remove('Server');

        return $response;
    }
}
