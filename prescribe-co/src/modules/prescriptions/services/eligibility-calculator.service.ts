import { Injectable } from '@nestjs/common';
import { EligibilityStatus } from '../../../common/enums/prescription.enums';
import { QuestionnaireResponse } from '../../questionnaires/entities/questionnaire-response.entity';

export interface EligibilityResult {
  status: EligibilityStatus;
  notes: string[];
}

/**
 * Derives EligibilityStatus from a QuestionnaireResponse.
 *
 * Three-tier model:
 *
 *   PASS — isEligible = true AND no ineligibility reasons.
 *          Prescription can proceed through the normal review queue.
 *
 *   FLAG — isEligible = true BUT reasons list is non-empty.
 *          This occurs when borderline answers don't auto-disqualify
 *          but warrant clinical attention. The prescriber sees a
 *          highlighted warning banner on the review screen.
 *
 *   FAIL — isEligible = false (one or more disqualifying answers).
 *          The request is still created so the prescriber can override
 *          with clinical justification, but the customer is informed
 *          the product may not be suitable.
 *
 * null is returned when no questionnaire was required (GSL products,
 * or POM products where questionnaire was waived by admin config).
 */
@Injectable()
export class EligibilityCalculator {
  calculate(response: QuestionnaireResponse | null): EligibilityResult | null {
    if (!response) return null;

    // Hard fail — disqualifying answers present
    if (!response.isEligible) {
      return {
        status: EligibilityStatus.FAIL,
        notes: response.ineligibilityReasons ?? ['Clinical review required'],
      };
    }

    // Eligible but with flags — borderline answers were noted
    if (
      response.isEligible &&
      response.ineligibilityReasons &&
      response.ineligibilityReasons.length > 0
    ) {
      return {
        status: EligibilityStatus.FLAG,
        notes: response.ineligibilityReasons,
      };
    }

    // Clean pass
    return { status: EligibilityStatus.PASS, notes: [] };
  }
}
