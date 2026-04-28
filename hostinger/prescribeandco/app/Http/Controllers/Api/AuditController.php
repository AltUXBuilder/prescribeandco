<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends Controller
{
    public function __construct(private AuditService $audit) {}

    public function index(Request $request): JsonResponse
    {
        $result = $this->audit->query(
            $request->only(['actor_id', 'action', 'entity_type', 'entity_id', 'from', 'to']),
            (int) $request->query('page', 1),
            (int) $request->query('limit', 50),
        );

        return response()->json($result);
    }

    public function prescriptionHistory(string $id): JsonResponse
    {
        return response()->json(
            $this->audit->getEntityHistory('PrescriptionRequest', $id)
        );
    }

    public function userHistory(string $id): JsonResponse
    {
        return response()->json(
            $this->audit->getEntityHistory('User', $id)
        );
    }
}
