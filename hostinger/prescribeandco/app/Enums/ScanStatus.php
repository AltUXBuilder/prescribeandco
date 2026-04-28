<?php

namespace App\Enums;

enum ScanStatus: string
{
    case PENDING  = 'PENDING';
    case CLEAN    = 'CLEAN';
    case INFECTED = 'INFECTED';
}
