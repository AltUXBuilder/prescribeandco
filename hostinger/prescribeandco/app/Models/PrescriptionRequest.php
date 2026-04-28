<?php

namespace App\Models;

use App\Enums\EligibilityStatus;
use App\Enums\PrescriptionStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PrescriptionRequest extends Model
{
    use HasUuids;

    protected $fillable = [
        'customer_id', 'product_id', 'questionnaire_response_id', 'delivery_address_id',
        'status', 'eligibility_status', 'eligibility_notes',
        'prescriber_id', 'dispenser_id', 'prescribed_date', 'expiry_date',
        'dosage_instructions', 'quantity_dispensed', 'rejection_reason', 'prescriber_note',
        'customer_note', 'submitted_at', 'reviewed_at', 'approved_at',
        'dispensing_started_at', 'fulfilled_at', 'cancelled_at',
        'tracking_number', 'courier_name',
    ];

    protected $casts = [
        'status'            => PrescriptionStatus::class,
        'eligibility_status'=> EligibilityStatus::class,
        'eligibility_notes' => 'array',
        'prescribed_date'   => 'date',
        'expiry_date'       => 'date',
        'submitted_at'      => 'datetime',
        'reviewed_at'       => 'datetime',
        'approved_at'       => 'datetime',
        'dispensing_started_at' => 'datetime',
        'fulfilled_at'      => 'datetime',
        'cancelled_at'      => 'datetime',
    ];

    public function getIsEditableAttribute(): bool
    {
        return $this->status === PrescriptionStatus::DRAFT;
    }

    public function getIsCancellableAttribute(): bool
    {
        return $this->status->isCancellable();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function questionnaireResponse(): BelongsTo
    {
        return $this->belongsTo(QuestionnaireResponse::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(PrescriptionDocument::class)->orderBy('uploaded_at');
    }

    public function payment(): HasOne
    {
        return $this->hasOne(Payment::class);
    }
}
