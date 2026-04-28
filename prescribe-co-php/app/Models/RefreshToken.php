<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RefreshToken extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'token_hash',
        'jti',
        'user_agent',
        'ip_address',
        'expires_at',
        'revoked_at',
        'created_at',
    ];

    protected $hidden = ['token_hash'];

    protected $casts = [
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function getIsExpiredAttribute(): bool
    {
        return $this->expires_at->isPast();
    }

    public function getIsRevokedAttribute(): bool
    {
        return $this->revoked_at !== null;
    }

    public function getIsValidAttribute(): bool
    {
        return !$this->is_expired && !$this->is_revoked;
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
