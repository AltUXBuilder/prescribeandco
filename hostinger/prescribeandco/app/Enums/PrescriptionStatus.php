<?php

namespace App\Enums;

enum PrescriptionStatus: string
{
    case DRAFT          = 'DRAFT';
    case SUBMITTED      = 'SUBMITTED';
    case UNDER_REVIEW   = 'UNDER_REVIEW';
    case APPROVED       = 'APPROVED';
    case DISPENSING     = 'DISPENSING';
    case FULFILLED      = 'FULFILLED';
    case REJECTED       = 'REJECTED';
    case CANCELLED      = 'CANCELLED';
    case EXPIRED        = 'EXPIRED';

    public function isTerminal(): bool
    {
        return in_array($this, [self::FULFILLED, self::REJECTED, self::CANCELLED, self::EXPIRED]);
    }

    public function isEditable(): bool
    {
        return $this === self::DRAFT;
    }

    public function isCancellable(): bool
    {
        return in_array($this, [self::DRAFT, self::SUBMITTED]);
    }
}
