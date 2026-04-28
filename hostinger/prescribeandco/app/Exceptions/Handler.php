<?php

namespace App\Exceptions;

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class Handler
{
    public static function renderJson(\Throwable $e): \Illuminate\Http\JsonResponse
    {
        if ($e instanceof HttpResponseException) {
            return $e->getResponse();
        }

        if ($e instanceof ValidationException) {
            return response()->json([
                'message' => 'Validation failed',
                'errors'  => $e->errors(),
            ], 422);
        }

        if ($e instanceof ModelNotFoundException || $e instanceof NotFoundHttpException) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($e instanceof ThrottleRequestsException) {
            return response()->json(['message' => 'Too many requests. Please slow down.'], 429);
        }

        if ($e instanceof HttpException) {
            return response()->json(['message' => $e->getMessage() ?: 'HTTP error'], $e->getStatusCode());
        }

        // Never leak internal details in production
        $message = app()->isLocal() ? $e->getMessage() : 'An internal error occurred';
        \Illuminate\Support\Facades\Log::error('Unhandled exception', [
            'message' => $e->getMessage(),
            'trace'   => $e->getTraceAsString(),
        ]);

        return response()->json(['message' => $message], 500);
    }
}
