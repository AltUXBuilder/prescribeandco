<?php

namespace App\Enums;

enum Role: string
{
    case CUSTOMER   = 'CUSTOMER';
    case ADMIN      = 'ADMIN';
    case PRESCRIBER = 'PRESCRIBER';
    case DISPENSER  = 'DISPENSER';
}
