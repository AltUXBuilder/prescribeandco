<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Enums\DocumentType;
use App\Enums\ScanStatus;
use App\Services\DocumentService;
use App\Services\PrescriptionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentController extends Controller
{
    public function __construct(
        private DocumentService     $documents,
        private PrescriptionService $prescriptions,
    ) {}

    public function index(string $prescriptionId, Request $request): JsonResponse
    {
        $user         = $request->attributes->get('user');
        $prescription = $this->prescriptions->findMyPrescriptionById($prescriptionId, $user->id);
        $docs         = $this->documents->findByPrescription($prescriptionId);

        return response()->json($this->documents->enrichWithPresignedUrls($docs));
    }

    public function store(string $prescriptionId, Request $request): JsonResponse
    {
        $request->validate([
            'document_type' => 'required|in:ID_PROOF,NHS_EXEMPTION,PRESCRIPTION_SCAN,OTHER',
        ]);

        if (!$request->hasFile('file') || !$request->file('file')->isValid()) {
            return response()->json(['message' => 'A valid file is required'], 400);
        }

        $user         = $request->attributes->get('user');
        $prescription = $this->prescriptions->findMyPrescriptionById($prescriptionId, $user->id);

        $uploadedFile = $request->file('file');
        $file = [
            'original_name' => $uploadedFile->getClientOriginalName(),
            'mime_type'     => $uploadedFile->getMimeType(),
            'contents'      => file_get_contents($uploadedFile->getRealPath()),
        ];

        $doc = $this->documents->upload(
            $prescriptionId,
            $user->id,
            $prescription->status,
            $prescription->customer_id,
            $file,
            DocumentType::from($request->input('document_type')),
        );

        return response()->json($doc, 201);
    }

    public function destroy(string $prescriptionId, string $documentId, Request $request): JsonResponse
    {
        $user         = $request->attributes->get('user');
        $prescription = $this->prescriptions->findMyPrescriptionById($prescriptionId, $user->id);

        $this->documents->remove($documentId, $user->id, $prescription->status);

        return response()->json(['message' => 'Document deleted']);
    }

    /**
     * Webhook from AV scanner. Requires a shared-secret header for authentication
     * (SCAN_WEBHOOK_SECRET env var). Never expose this endpoint publicly without the secret.
     */
    public function scanResult(string $prescriptionId, string $documentId, Request $request): JsonResponse
    {
        $expectedSecret = config('services.scan_webhook_secret');
        if ($expectedSecret && !hash_equals($expectedSecret, $request->header('X-Scan-Secret', ''))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $request->validate([
            'scan_status' => 'required|in:CLEAN,INFECTED',
            'threat_name' => 'nullable|string|max:255',
        ]);

        $doc = $this->documents->updateScanStatus(
            $documentId,
            ScanStatus::from($request->input('scan_status')),
            $request->input('threat_name'),
        );

        return response()->json($doc);
    }
}
