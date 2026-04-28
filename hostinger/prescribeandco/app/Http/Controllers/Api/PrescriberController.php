<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PrescriberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrescriberController extends Controller
{
    public function __construct(private PrescriberService $service) {}

    public function queue(Request $request): JsonResponse
    {
        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->getQueue($user->id, $request->query()));
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->getReviewDetail($id, $user->id, $profile));
    }

    public function claim(string $id, Request $request): JsonResponse
    {
        $request->validate(['note' => 'nullable|string|max:500']);

        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->claim($id, $user->id, $profile, $request->input('note')));
    }

    public function approve(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'dosage_instructions'            => 'required|string|max:1000',
            'quantity_to_dispense'           => 'required|integer|min:1|max:9999',
            'expiry_date'                    => 'required|date',
            'clinical_note'                  => 'nullable|string|max:2000',
            'eligibility_override_justification' => 'nullable|string|min:20|max:2000',
        ]);

        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->approve($id, $user->id, $profile, $request->validated()));
    }

    public function reject(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'reason'        => 'required|string|min:10|max:2000',
            'internal_note' => 'nullable|string|max:2000',
        ]);

        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->reject($id, $user->id, $profile, $request->validated()));
    }

    public function requestInfo(string $id, Request $request): JsonResponse
    {
        $request->validate(['requested_information' => 'required|string|min:10|max:2000']);

        $user    = $request->attributes->get('user');
        $profile = $request->attributes->get('prescriber_profile');

        return response()->json($this->service->requestMoreInfo($id, $user->id, $profile, $request->input('requested_information')));
    }
}
