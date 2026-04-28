<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        api: __DIR__ . '/../routes/api.php',
        apiPrefix: 'api/v1',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Global middleware applied to every request
        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        $middleware->append(\App\Http\Middleware\AuditContext::class);

        // Named middleware aliases
        $middleware->alias([
            'auth.jwt'   => \App\Http\Middleware\JwtAuthenticate::class,
            'role'       => \App\Http\Middleware\RequireRole::class,
            'prescriber' => \App\Http\Middleware\RequireVerifiedPrescriber::class,
        ]);

        // Disable cookie/session middleware for stateless API
        $middleware->statefulApi(false);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // Normalise all exceptions to consistent JSON shape
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->expectsJson() || $request->is('api/*')) {
                return \App\Exceptions\Handler::renderJson($e);
            }
        });
    })
    ->create();
