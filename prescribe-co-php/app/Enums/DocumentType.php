<?php

namespace App\Enums;

enum DocumentType: string
{
    case ID_PROOF          = 'ID_PROOF';
    case NHS_EXEMPTION     = 'NHS_EXEMPTION';
    case PRESCRIPTION_SCAN = 'PRESCRIPTION_SCAN';
    case OTHER             = 'OTHER';
}
