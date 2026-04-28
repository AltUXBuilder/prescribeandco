<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\Role;
use App\Models\RefreshToken;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserService
{
    public function __construct(private AuditService $audit) {}

    public function findById(string $id, bool $withProfile = false): User
    {
        $query = User::query();
        if ($withProfile) $query->with('prescriberProfile');

        $user = $query->find($id);
        if (!$user) abort(404, 'User not found');

        return $user;
    }

    public function findByEmail(string $email): ?User
    {
        return User::where('email', strtolower(trim($email)))->first();
    }

    public function updateRole(string $targetId, Role $role, string $adminId): User
    {
        $user = $this->findById($targetId);
        $before = ['role' => $user->role->value];

        $user->update(['role' => $role]);

        $this->audit->log($adminId, AuditAction::USER_ROLE_CHANGED, 'User', $targetId,
            $before, ['role' => $role->value]);

        return $user->fresh();
    }

    public function deactivate(string $targetId, string $adminId): void
    {
        $user = $this->findById($targetId);
        $user->update(['is_active' => false]);

        // Revoke all active refresh tokens immediately
        RefreshToken::where('user_id', $targetId)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now()]);

        $this->audit->log($adminId, AuditAction::USER_DEACTIVATED, 'User', $targetId,
            ['is_active' => true], ['is_active' => false]);
    }

    public function changePassword(string $userId, string $newPassword): void
    {
        User::where('id', $userId)
            ->update(['password_hash' => Hash::make($newPassword, ['rounds' => 12])]);

        $this->audit->log($userId, AuditAction::USER_PASSWORD_CHANGED, 'User', $userId);
    }

    public function emailExists(string $email): bool
    {
        return User::where('email', strtolower(trim($email)))->exists();
    }

    public function gphcExists(string $gphcNumber): bool
    {
        return \App\Models\PrescriberProfile::where('gphc_number', $gphcNumber)->exists();
    }
}
