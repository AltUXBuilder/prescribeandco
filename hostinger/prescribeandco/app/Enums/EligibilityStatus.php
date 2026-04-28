<?php

namespace App\Enums;

enum EligibilityStatus: string
{
    case PASS = 'PASS';
    case FLAG = 'FLAG';
    case FAIL = 'FAIL';
}
