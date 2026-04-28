<?php

namespace App\Models;

use App\Enums\DocumentType;
use App\Enums\ScanStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PrescriptionDocument extends Model
{
    use HasUuids;

    public $timestamps = false;

    protected $fillable = [
        'prescription_request_id', 'uploader_id', 'document_type',
        's3_key', 'original_filename', 'mime_type', 'file_size_bytes',
        'scan_status', 'scan_completed_at', 'uploaded_at',
    ];

    // s3_key must never appear in API responses
    protected $hidden = ['s3_key'];

    protected $casts = [
        'document_type'    => DocumentType::class,
        'scan_status'      => ScanStatus::class,
        'scan_completed_at'=> 'datetime',
        'uploaded_at'      => 'datetime',
    ];

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(PrescriptionRequest::class, 'prescription_request_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploader_id');
    }
}
