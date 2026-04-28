<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RefreshTokenRequest;
use App\Http\Requests\Auth\RegisterPrescriberRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AuthService;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $auth,
        private UserService $users,
    ) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        if ($this->users->emailExists($request->input('email'))) {
            return response()->json(['message' => 'Email address is already registered'], 409);
        }

        $result = $this->auth->registerCustomer($request->validated());

        return response()->json([
            'user'   => $result['user'],
            'tokens' => $result['tokens'],
        ], 201);
    }

    public function registerPrescriber(RegisterPrescriberRequest $request): JsonResponse
    {
        if ($this->users->emailExists($request->input('email'))) {
            return response()->json(['message' => 'Email address is already registered'], 409);
        }
        if ($this->users->gphcExists($request->input('gphc_number'))) {
            return response()->json(['message' => 'GPhC number is already registered'], 409);
        }

        $result = $this->auth->registerPrescriber($request->validated());

        return response()->json([
            'user'   => $result['user'],
            'tokens' => $result['tokens'],
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $result = $this->auth->login(
                $request->input('email'),
                $request->input('password'),
                $request->ip(),
                $request->userAgent(),
            );
        } catch (\RuntimeException $e) {
            // Uniform message regardless of whether email or password was wrong
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        return response()->json([
            'user'   => $result['user'],
            'tokens' => $result['tokens'],
        ]);
    }

    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        try {
            $tokens = $this->auth->refresh(
                $request->input('refresh_token'),
                $request->ip(),
                $request->userAgent(),
            );
        } catch (\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        return response()->json($tokens);
    }

    public function logout(Request $request): JsonResponse
    {
        $user    = $request->attributes->get('user');
        $payload = $this->getAccessPayload($request);

        if ($payload) {
            $this->auth->logout($payload->jti, $user->id);
        }

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function logoutAll(Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');
        $this->auth->logoutAll($user->id);

        return response()->json(['message' => 'All sessions terminated']);
    }

    private function getAccessPayload(Request $request): ?object
    {
        try {
            $token = substr($request->header('Authorization', ''), 7);
            return app(\App\Services\JwtService::class)->validateAccessToken($token);
        } catch (\Throwable) {
            return null;
        }
    }
}
