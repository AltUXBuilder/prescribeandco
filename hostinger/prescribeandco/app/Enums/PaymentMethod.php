<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case CARD        = 'CARD';
    case NHS_VOUCHER = 'NHS_VOUCHER';
    case EXEMPT      = 'EXEMPT';
}
