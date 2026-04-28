<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\DispenserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DispenserController extends Controller
{
    public function __construct(private DispenserService $service) {}

    public function queue(Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');

        return response()->json($this->service->getQueue($user->id, $request->query()));
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $user = $request->attributes->get('user');

        return response()->json($this->service->getDetail($id, $user->id));
    }

    public function claim(string $id, Request $request): JsonResponse
    {
        $request->validate(['note' => 'nullable|string|max:500']);

        $user = $request->attributes->get('user');

        return response()->json($this->service->claim($id, $user->id, $request->input('note')));
    }

    public function updateTracking(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'tracking_number' => 'nullable|string|max:100',
            'courier_name'    => 'nullable|string|max:100',
            'dispensing_note' => 'nullable|string|max:1000',
        ]);

        $user = $request->attributes->get('user');

        return response()->json($this->service->updateTracking($id, $user->id, $request->validated()));
    }

    public function fulfil(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'tracking_number' => 'required|string|max:100',
            'courier_name'    => 'required|string|max:100',
            'dispensing_note' => 'nullable|string|max:1000',
        ]);

        $user = $request->attributes->get('user');

        return response()->json($this->service->markFulfilled($id, $user->id, $request->validated()));
    }
}
