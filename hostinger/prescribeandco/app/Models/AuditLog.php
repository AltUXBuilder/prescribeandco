<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasUuids;

    // INSERT-only: no updated_at, never modify rows
    public $timestamps = false;

    protected $fillable = [
        'actor_id', 'gphc_number', 'actor_role', 'action',
        'entity_type', 'entity_id', 'before_state', 'after_state',
        'metadata', 'ip_address', 'user_agent', 'created_at',
    ];

    protected $casts = [
        'before_state' => 'array',
        'after_state'  => 'array',
        'metadata'     => 'array',
        'created_at'   => 'datetime',
    ];
}
