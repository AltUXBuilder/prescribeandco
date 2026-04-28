<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class JwtAuthenticate
{
    public function __construct(private JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $this->extractBearer($request);

        if (!$token) {
            return $this->unauthorised('Missing or malformed Authorization header');
        }

        try {
            $payload = $this->jwt->validateAccessToken($token);
        } catch (\RuntimeException $e) {
            return $this->unauthorised($e->getMessage());
        }

        // Re-check user is still active in the database.
        // This ensures deactivated accounts are rejected immediately,
        // without waiting for the 15-minute access token TTL to expire.
        $user = User::find($payload->sub);

        if (!$user || !$user->is_active) {
            return $this->unauthorised('Account not found or deactivated');
        }

        $request->attributes->set('user', $user);

        return $next($request);
    }

    private function extractBearer(Request $request): ?string
    {
        $header = $request->header('Authorization', '');

        if (str_starts_with($header, 'Bearer ')) {
            $token = substr($header, 7);
            // Basic sanity: a JWT has exactly 2 dots
            if (substr_count($token, '.') === 2) {
                return $token;
            }
        }

        return null;
    }

    private function unauthorised(string $message): Response
    {
        return response()->json(['message' => $message], 401);
    }
}
