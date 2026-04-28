<?php

namespace App\Enums;

enum MedicineType: string
{
    case POM = 'POM'; // Prescription Only Medicine
    case P   = 'P';   // Pharmacy medicine
    case GSL = 'GSL'; // General Sales List
}
