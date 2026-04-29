<?php

namespace App\Services;

use App\Enums\AuditAction;
use App\Enums\DocumentType;
use App\Enums\PrescriptionStatus;
use App\Enums\ScanStatus;
use App\Models\PrescriptionDocument;
use Ramsey\Uuid\Uuid;

class DocumentService
{
    private const ALLOWED_MIMES = [
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    private const MAX_SIZE_BYTES  = 10 * 1024 * 1024; // 10 MB
    private const MAX_PER_REQUEST = 10;

    public function __construct(
        private StorageService $storage,
        private AuditService   $audit,
    ) {}

    public function upload(
        string       $prescriptionId,
        string       $uploaderId,
        PrescriptionStatus $prescriptionStatus,
        string       $prescriptionCustomerId,
        array        $file,
        DocumentType $documentType,
    ): PrescriptionDocument {
        // Ownership check: uploader must own the prescription
        if ($uploaderId !== $prescriptionCustomerId) {
            abort(403, 'You can only upload documents to your own prescriptions');
        }

        if ($prescriptionStatus !== PrescriptionStatus::DRAFT) {
            abort(400, 'Documents can only be uploaded to DRAFT prescriptions');
        }

        $count = PrescriptionDocument::where('prescription_request_id', $prescriptionId)->count();
        if ($count >= self::MAX_PER_REQUEST) {
            abort(400, 'Maximum 10 documents per prescription');
        }

        $this->validateFile($file);

        $result = $this->storage->upload(
            $prescriptionId,
            $file['original_name'],
            $file['mime_type'],
            $file['contents'],
        );

        $doc = PrescriptionDocument::create([
            'id'                       => Uuid::uuid4()->toString(),
            'prescription_request_id'  => $prescriptionId,
            'uploader_id'              => $uploaderId,
            'document_type'            => $documentType,
            's3_key'                   => $result['s3_key'],
            'original_filename'        => $file['original_name'],
            'mime_type'                => $file['mime_type'],
            'file_size_bytes'          => $result['size'],
            'scan_status'              => ScanStatus::PENDING,
            'uploaded_at'              => now(),
        ]);

        $this->audit->log($uploaderId, AuditAction::DOCUMENT_UPLOADED, 'PrescriptionDocument', $doc->id,
            null, ['type' => $documentType->value, 'size' => $result['size']]);

        return $doc;
    }

    public function findByPrescription(string $prescriptionId): \Illuminate\Support\Collection
    {
        return PrescriptionDocument::where('prescription_request_id', $prescriptionId)
            ->orderBy('uploaded_at')
            ->get();
    }

    public function getPresignedUrl(string $documentId, string $requesterId, bool $isAdmin = false): string
    {
        $doc = PrescriptionDocument::findOrFail($documentId);

        if (!$isAdmin && $doc->uploader_id !== $requesterId) {
            abort(403, 'Access denied');
        }

        if ($doc->scan_status === ScanStatus::INFECTED) {
            abort(403, 'Document failed virus scan and cannot be accessed');
        }

        $this->audit->log($requesterId, AuditAction::DOCUMENT_ACCESSED, 'PrescriptionDocument', $documentId);

        return $this->storage->generatePresignedUrl($doc->s3_key);
    }

    public function enrichWithPresignedUrls(\Illuminate\Support\Collection $docs): \Illuminate\Support\Collection
    {
        return $docs->map(function (PrescriptionDocument $doc) {
            if ($doc->scan_status !== ScanStatus::INFECTED) {
                $doc->presigned_url = $this->storage->generatePresignedUrl($doc->s3_key);
            } else {
                $doc->presigned_url = null;
            }
            return $doc;
        });
    }

    public function updateScanStatus(string $documentId, ScanStatus $status, ?string $threatName = null): PrescriptionDocument
    {
        $doc = PrescriptionDocument::findOrFail($documentId);
        $doc->update([
            'scan_status'       => $status,
            'scan_completed_at' => now(),
        ]);

        $this->audit->log('system', AuditAction::DOCUMENT_SCAN_COMPLETED, 'PrescriptionDocument', $documentId,
            null, ['scan_status' => $status->value, 'threat' => $threatName]);

        return $doc->fresh();
    }

    public function remove(string $documentId, string $requesterId, PrescriptionStatus $prescriptionStatus): void
    {
        $doc = PrescriptionDocument::findOrFail($documentId);

        if ($doc->uploader_id !== $requesterId) {
            abort(403, 'Access denied');
        }

        if ($prescriptionStatus !== PrescriptionStatus::DRAFT) {
            abort(400, 'Documents can only be deleted from DRAFT prescriptions');
        }

        $this->storage->delete($doc->s3_key);
        $doc->delete();

        $this->audit->log($requesterId, AuditAction::DOCUMENT_DELETED, 'PrescriptionDocument', $documentId);
    }

    public function assertAllDocumentsClean(string $prescriptionId): void
    {
        $pending  = PrescriptionDocument::where('prescription_request_id', $prescriptionId)
            ->where('scan_status', ScanStatus::PENDING->value)->count();
        $infected = PrescriptionDocument::where('prescription_request_id', $prescriptionId)
            ->where('scan_status', ScanStatus::INFECTED->value)->count();

        if ($pending > 0) {
            abort(400, 'Some documents are still being scanned. Please wait and try again.');
        }
        if ($infected > 0) {
            abort(400, 'One or more documents failed virus scanning. Please re-upload clean files.');
        }
    }

    // ── File validation ────────────────────────────────────────────────────────

    private function validateFile(array $file): void
    {
        if (!in_array($file['mime_type'], self::ALLOWED_MIMES, true)) {
            abort(400, 'File type not allowed. Accepted: PDF, PNG, JPG, WEBP, DOC, DOCX');
        }
        if (strlen($file['contents']) > self::MAX_SIZE_BYTES) {
            abort(400, 'File exceeds 10 MB limit');
        }
    }
}
