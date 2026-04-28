<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PrescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    public function __construct(private PrescriptionService $service) {}

    public function index(Request $request): JsonResponse
    {
        $user   = $request->attributes->get('user');
        $result = $this->service->findMyPrescriptions($user->id, $request->query());

        return response()->json($result);
    }

    public function show(string $id, Request $request): JsonResponse
    {
        $user         = $request->attributes->get('user');
        $prescription = $this->service->findMyPrescriptionById($id, $user->id);

        return response()->json($prescription->load(['product', 'documents', 'questionnaireResponse']));
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'product_id'          => 'required|uuid',
            'delivery_address_id' => 'nullable|uuid',
            'customer_note'       => 'nullable|string|max:2000',
        ]);

        $user         = $request->attributes->get('user');
        $prescription = $this->service->createDraft($user->id, $request->only([
            'product_id', 'delivery_address_id', 'customer_note',
        ]));

        return response()->json($prescription, 201);
    }

    public function attachQuestionnaire(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'questionnaire_response_id' => 'required|uuid',
        ]);

        $user         = $request->attributes->get('user');
        $prescription = $this->service->attachQuestionnaireResponse(
            $id, $user->id, $request->input('questionnaire_response_id')
        );

        return response()->json($prescription);
    }

    public function submit(string $id, Request $request): JsonResponse
    {
        $request->validate([
            'delivery_address_id'         => 'nullable|uuid',
            'customer_note'               => 'nullable|string|max:2000',
            'payment.payment_method'      => 'nullable|in:CARD,NHS_VOUCHER,EXEMPT',
            'payment.payment_method_token'=> 'nullable|string',
        ]);

        $user         = $request->attributes->get('user');
        $prescription = $this->service->submit($id, $user->id, $request->only([
            'delivery_address_id', 'customer_note', 'payment',
        ]));

        return response()->json($prescription);
    }

    public function cancel(string $id, Request $request): JsonResponse
    {
        $request->validate(['reason' => 'required|string|min:5|max:2000']);

        $user         = $request->attributes->get('user');
        $prescription = $this->service->cancel($id, $user->id, $request->input('reason'));

        return response()->json($prescription);
    }
}
