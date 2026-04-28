<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Global middleware applied to every request
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->append(\App\Http\Middleware\AuditContext::class);

        // Named middleware aliases
        $middleware->alias([
            // API — stateless JWT
            'auth.jwt'   => \App\Http\Middleware\JwtAuthenticate::class,
            'role'       => \App\Http\Middleware\RequireRole::class,
            'prescriber' => \App\Http\Middleware\RequireVerifiedPrescriber::class,

            // Web — session-based
            'web.auth'   => \App\Http\Middleware\WebAuthenticate::class,
            'web.role'   => \App\Http\Middleware\WebRequireRole::class,
            'web.guest'  => \App\Http\Middleware\WebGuest::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // JSON errors for API routes; web routes get default HTML error pages
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return \App\Exceptions\Handler::renderJson($e);
            }
        });
    })
    ->create();
