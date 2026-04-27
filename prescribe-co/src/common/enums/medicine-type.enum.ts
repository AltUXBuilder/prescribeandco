/**
 * UK medicine classification (MHRA).
 *   POM  — Prescription Only Medicine
 *   P    — Pharmacy medicine (pharmacist supervision)
 *   GSL  — General Sales List (no professional oversight)
 */
export enum MedicineType {
  POM = 'POM',
  P   = 'P',
  GSL = 'GSL',
}

export enum ProductStatus {
  ACTIVE   = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}
