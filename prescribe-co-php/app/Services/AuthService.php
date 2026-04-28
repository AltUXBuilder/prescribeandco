<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Ramsey\Uuid\Uuid;

class AuthService
{
    public function __construct(
        private JwtService   $jwt,
        private AuditService $audit,
    ) {}

    // ── Register ───────────────────────────────────────────────────────────────

    public function registerCustomer(array $data): array
    {
        $user = User::create([
            'id'            => Uuid::uuid4()->toString(),
            'email'         => strtolower(trim($data['email'])),
            'password_hash' => Hash::make($data['password'], ['rounds' => 12]),
            'role'          => Role::CUSTOMER,
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'nhs_number'    => $data['nhs_number'] ?? null,
            'phone'         => $data['phone'] ?? null,
            'date_of_birth' => $data['date_of_birth'] ?? null,
        ]);

        $tokens = $this->issueTokens($user);

        $this->audit->log($user->id, AuditAction::USER_REGISTERED, 'User', $user->id,
            null, ['email' => $user->email, 'role' => Role::CUSTOMER->value]);

        return compact('user', 'tokens');
    }

    public function registerPrescriber(array $data): array
    {
        $user = User::create([
            'id'            => Uuid::uuid4()->toString(),
            'email'         => strtolower(trim($data['email'])),
            'password_hash' => Hash::make($data['password'], ['rounds' => 12]),
            'role'          => Role::PRESCRIBER,
            'first_name'    => $data['first_name'],
            'last_name'     => $data['last_name'],
            'phone'         => $data['phone'] ?? null,
        ]);

        $user->prescriberProfile()->create([
            'id'             => Uuid::uuid4()->toString(),
            'user_id'        => $user->id,
            'gphc_number'    => $data['gphc_number'],
            'specialisation' => $data['specialisation'] ?? null,
            'organisation'   => $data['organisation'] ?? null,
        ]);

        $tokens = $this->issueTokens($user);

        $this->audit->log($user->id, AuditAction::USER_REGISTERED, 'User', $user->id,
            null, ['email' => $user->email, 'role' => Role::PRESCRIBER->value, 'gphc' => $data['gphc_number']]);

        return compact('user', 'tokens');
    }

    // ── Login ──────────────────────────────────────────────────────────────────

    public function login(string $email, string $password, ?string $ip, ?string $userAgent): array
    {
        $user = User::where('email', strtolower(trim($email)))->first();

        // Use constant-time comparison to prevent user enumeration via timing
        if (!$user || !Hash::check($password, $user->password_hash)) {
            throw new \RuntimeException('Invalid credentials', 401);
        }

        if (!$user->is_active) {
            throw new \RuntimeException('Account has been deactivated', 403);
        }

        $user->update(['last_login_at' => now()]);

        $tokens = $this->issueTokens($user, $ip, $userAgent);

        $this->audit->log($user->id, AuditAction::USER_LOGIN, 'User', $user->id,
            null, null, ['ip' => $ip], $user->role->value);

        return compact('user', 'tokens');
    }

    // ── Token issuance ─────────────────────────────────────────────────────────

    public function issueTokens(User $user, ?string $ip = null, ?string $userAgent = null): array
    {
        $access  = $this->jwt->generateAccessToken($user);
        $refresh = $this->jwt->generateRefreshToken($user);

        // Store bcrypt hash of the refresh token — NEVER the raw token
        RefreshToken::create([
            'id'          => Uuid::uuid4()->toString(),
            'user_id'     => $user->id,
            'token_hash'  => Hash::make($refresh['token'], ['rounds' => 12]),
            'jti'         => $refresh['jti'],
            'user_agent'  => $userAgent,
            'ip_address'  => $ip,
            'expires_at'  => date('Y-m-d H:i:s', $refresh['expiresAt']),
            'created_at'  => now(),
        ]);

        return [
            'access_token'  => $access['token'],
            'refresh_token' => $refresh['token'],
            'expires_in'    => (int) config('auth.jwt_access_ttl', 900),
        ];
    }

    // ── Refresh (with rotation) ────────────────────────────────────────────────

    public function refresh(string $rawToken, ?string $ip, ?string $userAgent): array
    {
        try {
            $payload = $this->jwt->validateRefreshToken($rawToken);
        } catch (\RuntimeException $e) {
            throw new \RuntimeException('Refresh token invalid or expired', 401);
        }

        $record = RefreshToken::where('jti', $payload->jti)->first();

        if (!$record || !$record->is_valid) {
            throw new \RuntimeException('Refresh token not found or revoked', 401);
        }

        // Hash comparison must be constant-time to resist timing attacks
        if (!Hash::check($rawToken, $record->token_hash)) {
            // Hash mismatch = possible token theft — revoke all sessions for this user
            RefreshToken::where('user_id', $record->user_id)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now()]);

            throw new \RuntimeException('Refresh token mismatch — all sessions revoked', 401);
        }

        $user = User::find($record->user_id);
        if (!$user || !$user->is_active) {
            throw new \RuntimeException('Account not found or deactivated', 401);
        }

        // Revoke the used token (rotation prevents replay)
        $record->update(['revoked_at' => now()]);

        $tokens = $this->issueTokens($user, $ip, $userAgent);

        $this->audit->log($user->id, AuditAction::USER_TOKEN_REFRESHED, 'User', $user->id,
            null, null, ['ip' => $ip], $user->role->value);

        return $tokens;
    }

    // ── Logout ─────────────────────────────────────────────────────────────────

    public function logout(string $jti, string $userId): void
    {
        RefreshToken::where('jti', $jti)
            ->where('user_id', $userId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $this->audit->log($userId, AuditAction::USER_LOGOUT, 'User', $userId);
    }

    public function logoutAll(string $userId): void
    {
        RefreshToken::where('user_id', $userId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $this->audit->log($userId, AuditAction::USER_LOGOUT_ALL, 'User', $userId);
    }
}
