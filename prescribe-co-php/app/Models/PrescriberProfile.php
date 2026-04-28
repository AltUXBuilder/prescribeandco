<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriberProfile extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'gphc_number',
        'gphc_verified',
        'gphc_verified_at',
        'specialisation',
        'organisation',
        'indemnity_ref',
        'indemnity_expiry',
    ];

    protected $casts = [
        'gphc_verified'    => 'boolean',
        'gphc_verified_at' => 'datetime',
        'indemnity_expiry' => 'date',
    ];

    public function getIndemnityExpiredAttribute(): bool
    {
        return $this->indemnity_expiry !== null && $this->indemnity_expiry->isPast();
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
