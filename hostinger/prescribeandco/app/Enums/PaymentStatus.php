<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case PENDING              = 'PENDING';
    case AUTHORISED           = 'AUTHORISED';
    case CAPTURED             = 'CAPTURED';
    case FAILED               = 'FAILED';
    case REFUNDED             = 'REFUNDED';
    case PARTIALLY_REFUNDED   = 'PARTIALLY_REFUNDED';
    case VOIDED               = 'VOIDED';

    public function isRefundable(): bool
    {
        return in_array($this, [self::CAPTURED, self::PARTIALLY_REFUNDED]);
    }
}
