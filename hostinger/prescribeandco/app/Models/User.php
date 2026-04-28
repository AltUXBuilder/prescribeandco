<?php

namespace App\Models;

use App\Enums\Role;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'email',
        'password_hash',
        'role',
        'first_name',
        'last_name',
        'nhs_number',
        'phone',
        'date_of_birth',
        'is_verified',
        'is_active',
        'last_login_at',
    ];

    // Never serialise credentials or internal timestamps
    protected $hidden = [
        'password_hash',
        'deleted_at',
    ];

    protected $casts = [
        'role'               => Role::class,
        'is_verified'        => 'boolean',
        'is_active'          => 'boolean',
        'email_verified_at'  => 'datetime',
        'last_login_at'      => 'datetime',
    ];

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    public function prescriberProfile(): HasOne
    {
        return $this->hasOne(PrescriberProfile::class);
    }

    public function refreshTokens(): HasMany
    {
        return $this->hasMany(RefreshToken::class);
    }
}
