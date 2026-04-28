<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Log;
use Ramsey\Uuid\Uuid;

class AuditService
{
    /**
     * Persist an immutable audit record.
     * Never throws — audit failure must not block business operations.
     */
    public function log(
        string      $actorId,
        AuditAction $action,
        string      $entityType,
        ?string     $entityId   = null,
        ?array      $before     = null,
        ?array      $after      = null,
        ?array      $metadata   = null,
        ?string     $actorRole  = null,
        ?string     $gphcNumber = null,
    ): void {
        try {
            AuditLog::create([
                'id'           => Uuid::uuid4()->toString(),
                'actor_id'     => $actorId,
                'gphc_number'  => $gphcNumber,
                'actor_role'   => $actorRole,
                'action'       => $action->value,
                'entity_type'  => $entityType,
                'entity_id'    => $entityId,
                'before_state' => $before,
                'after_state'  => $after,
                'metadata'     => $metadata,
                'ip_address'   => request()->ip(),
                'user_agent'   => request()->userAgent(),
                'created_at'   => now(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Audit log write failed', [
                'action'    => $action->value,
                'entityId'  => $entityId,
                'error'     => $e->getMessage(),
            ]);
        }
    }

    public function query(array $filters = [], int $page = 1, int $limit = 50): array
    {
        $query = AuditLog::query()->orderByDesc('created_at');

        if (!empty($filters['actor_id']))    $query->where('actor_id', $filters['actor_id']);
        if (!empty($filters['action']))      $query->where('action', $filters['action']);
        if (!empty($filters['entity_type'])) $query->where('entity_type', $filters['entity_type']);
        if (!empty($filters['entity_id']))   $query->where('entity_id', $filters['entity_id']);
        if (!empty($filters['from']))        $query->where('created_at', '>=', $filters['from']);
        if (!empty($filters['to']))          $query->where('created_at', '<=', $filters['to']);

        $total = $query->count();
        $logs  = $query->offset(($page - 1) * $limit)->limit($limit)->get();

        return [
            'data'        => $logs,
            'total'       => $total,
            'page'        => $page,
            'limit'       => $limit,
            'total_pages' => (int) ceil($total / $limit),
        ];
    }

    public function getEntityHistory(string $entityType, string $entityId): \Illuminate\Support\Collection
    {
        return AuditLog::where('entity_type', $entityType)
            ->where('entity_id', $entityId)
            ->orderBy('created_at')
            ->get();
    }
}
