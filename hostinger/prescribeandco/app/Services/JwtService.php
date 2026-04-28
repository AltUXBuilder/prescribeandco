<?php

namespace App\Services;

use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\SignatureInvalidException;
use Ramsey\Uuid\Uuid;

class JwtService
{
    private string $accessSecret;
    private string $refreshSecret;
    private int    $accessTtl;
    private int    $refreshTtl;

    public function __construct()
    {
        $this->accessSecret  = config('auth.jwt_access_secret');
        $this->refreshSecret = config('auth.jwt_refresh_secret');
        $this->accessTtl     = (int) config('auth.jwt_access_ttl', 900);
        $this->refreshTtl    = (int) config('auth.jwt_refresh_ttl', 604800);
    }

    // ── Token generation ───────────────────────────────────────────────────────

    public function generateAccessToken(User $user): array
    {
        $jti = Uuid::uuid4()->toString();
        $now = time();

        $payload = [
            'sub'   => $user->id,
            'email' => $user->email,
            'role'  => $user->role->value,
            'jti'   => $jti,
            'iat'   => $now,
            'exp'   => $now + $this->accessTtl,
        ];

        return [
            'token'     => JWT::encode($payload, $this->accessSecret, 'HS256'),
            'jti'       => $jti,
            'expiresAt' => $now + $this->accessTtl,
        ];
    }

    public function generateRefreshToken(User $user): array
    {
        $jti = Uuid::uuid4()->toString();
        $now = time();

        $payload = [
            'sub' => $user->id,
            'jti' => $jti,
            'iat' => $now,
            'exp' => $now + $this->refreshTtl,
        ];

        return [
            'token'     => JWT::encode($payload, $this->refreshSecret, 'HS256'),
            'jti'       => $jti,
            'expiresAt' => $now + $this->refreshTtl,
        ];
    }

    // ── Token validation ───────────────────────────────────────────────────────

    /**
     * Validates an access token and returns the decoded payload.
     * Throws \RuntimeException on any invalid state.
     */
    public function validateAccessToken(string $token): object
    {
        return $this->decode($token, $this->accessSecret);
    }

    /**
     * Validates a refresh token and returns the decoded payload.
     * Throws \RuntimeException on any invalid state.
     */
    public function validateRefreshToken(string $token): object
    {
        return $this->decode($token, $this->refreshSecret);
    }

    // ── Internal ───────────────────────────────────────────────────────────────

    private function decode(string $token, string $secret): object
    {
        try {
            return JWT::decode($token, new Key($secret, 'HS256'));
        } catch (ExpiredException $e) {
            throw new \RuntimeException('Token has expired', 401, $e);
        } catch (SignatureInvalidException $e) {
            throw new \RuntimeException('Token signature is invalid', 401, $e);
        } catch (\Exception $e) {
            throw new \RuntimeException('Token is invalid', 401, $e);
        }
    }
}
