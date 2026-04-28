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

        return $response
            ->header('X-Content-Type-Options',    'nosniff')
            ->header('X-Frame-Options',            'DENY')
            ->header('X-XSS-Protection',           '1; mode=block')
            ->header('Referrer-Policy',            'strict-origin-when-cross-origin')
            ->header('Permissions-Policy',         'geolocation=(), microphone=(), camera=()')
            ->header('Strict-Transport-Security',  'max-age=31536000; includeSubDomains')
            ->header('Content-Security-Policy',    $csp)
            ->header('Cache-Control',              'no-store, no-cache, must-revalidate, private')
            ->header('X-Powered-By',               '')
            ->withoutHeader('Server');
    }
}
