<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuids;

    // payment_method_token is sensitive — never expose in responses
    protected $hidden = ['payment_method_token', 'raw_provider_response'];

    protected $fillable = [
        'prescription_request_id', 'payment_method', 'status',
        'amount_pence', 'currency', 'refunded_amount_pence',
        'payment_method_token', 'idempotency_key',
        'provider_payment_id', 'provider_charge_id', 'provider_refund_id',
        'failure_code', 'failure_message',
        'authorized_at', 'captured_at', 'refunded_at',
        'raw_provider_response', 'last_webhook_event_id',
    ];

    protected $casts = [
        'payment_method'       => PaymentMethod::class,
        'status'               => PaymentStatus::class,
        'raw_provider_response'=> 'array',
        'authorized_at'        => 'datetime',
        'captured_at'          => 'datetime',
        'refunded_at'          => 'datetime',
    ];

    public function getNetAmountPenceAttribute(): int
    {
        return $this->amount_pence - $this->refunded_amount_pence;
    }

    public function getIsRefundableAttribute(): bool
    {
        return $this->status->isRefundable();
    }

    public function prescription(): BelongsTo
    {
        return $this->belongsTo(PrescriptionRequest::class, 'prescription_request_id');
    }
}
