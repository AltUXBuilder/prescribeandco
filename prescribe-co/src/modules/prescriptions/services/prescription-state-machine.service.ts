import { BadRequestException, Injectable } from '@nestjs/common';
import { PrescriptionStatus } from '../../../common/enums/prescription.enums';

/**
 * Allowed transitions map.
 * Key: current status → Value: set of valid next statuses.
 *
 * This is the single source of truth for the prescription lifecycle.
 * No service method may mutate `status` without going through this guard.
 */
const ALLOWED_TRANSITIONS = new Map<PrescriptionStatus, Set<PrescriptionStatus>>([
  [PrescriptionStatus.DRAFT,        new Set([PrescriptionStatus.SUBMITTED, PrescriptionStatus.CANCELLED])],
  [PrescriptionStatus.SUBMITTED,    new Set([PrescriptionStatus.UNDER_REVIEW, PrescriptionStatus.CANCELLED])],
  [PrescriptionStatus.UNDER_REVIEW, new Set([PrescriptionStatus.APPROVED, PrescriptionStatus.REJECTED])],
  [PrescriptionStatus.APPROVED,     new Set([PrescriptionStatus.DISPENSING])],
  [PrescriptionStatus.DISPENSING,   new Set([PrescriptionStatus.FULFILLED])],
  // Terminal states — no further transitions
  [PrescriptionStatus.FULFILLED,    new Set()],
  [PrescriptionStatus.REJECTED,     new Set()],
  [PrescriptionStatus.CANCELLED,    new Set()],
  [PrescriptionStatus.EXPIRED,      new Set()],
]);

@Injectable()
export class PrescriptionStateMachine {
  /**
   * Assert that transitioning from `current` to `next` is valid.
   * Throws BadRequestException with a descriptive message on failure.
   */
  assertTransition(
    current: PrescriptionStatus,
    next: PrescriptionStatus,
    prescriptionId?: string,
  ): void {
    const allowed = ALLOWED_TRANSITIONS.get(current);

    if (!allowed) {
      throw new BadRequestException(
        `Prescription ${prescriptionId ?? ''} is in an unrecognised status: "${current}"`,
      );
    }

    if (!allowed.has(next)) {
      throw new BadRequestException(
        `Cannot transition prescription ${prescriptionId ?? ''} from ` +
          `"${current}" to "${next}". ` +
          `Allowed next statuses: [${[...allowed].join(', ') || 'none — terminal state'}]`,
      );
    }
  }

  /** Returns the set of valid next statuses for a given current status */
  availableTransitions(current: PrescriptionStatus): PrescriptionStatus[] {
    return [...(ALLOWED_TRANSITIONS.get(current) ?? new Set())];
  }

  isTerminal(status: PrescriptionStatus): boolean {
    return (ALLOWED_TRANSITIONS.get(status)?.size ?? 0) === 0;
  }
}
