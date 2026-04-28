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

        return $response
            ->header('X-Content-Type-Options',    'nosniff')
            ->header('X-Frame-Options',            'DENY')
            ->header('X-XSS-Protection',           '1; mode=block')
            ->header('Referrer-Policy',            'strict-origin-when-cross-origin')
            ->header('Permissions-Policy',         'geolocation=(), microphone=(), camera=()')
            ->header('Strict-Transport-Security',  'max-age=31536000; includeSubDomains')
            ->header('Content-Security-Policy',    "default-src 'none'")
            ->header('Cache-Control',              'no-store, no-cache, must-revalidate, private')
            ->header('X-Powered-By',               '') // suppress PHP version
            ->withoutHeader('Server');                  // suppress server identity
    }
}
