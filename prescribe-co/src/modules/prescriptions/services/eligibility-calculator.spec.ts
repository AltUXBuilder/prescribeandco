import { EligibilityCalculator } from './eligibility-calculator.service';
import { EligibilityStatus } from '../../../common/enums/prescription.enums';
import { QuestionnaireResponse } from '../../questionnaires/entities/questionnaire-response.entity';

function makeResponse(
  isEligible: boolean,
  reasons: string[] | null = null,
): QuestionnaireResponse {
  return {
    id: 'test-id',
    userId: 'user-1',
    questionnaireId: 'q-1',
    questionnaireVersion: 1,
    answers: {},
    isEligible,
    ineligibilityReasons: reasons,
    submittedAt: new Date(),
  } as QuestionnaireResponse;
}

describe('EligibilityCalculator', () => {
  let calculator: EligibilityCalculator;

  beforeEach(() => {
    calculator = new EligibilityCalculator();
  });

  it('returns null when no questionnaire response provided', () => {
    expect(calculator.calculate(null)).toBeNull();
  });

  it('returns PASS for eligible response with no reasons', () => {
    const result = calculator.calculate(makeResponse(true, null));
    expect(result?.status).toBe(EligibilityStatus.PASS);
    expect(result?.notes).toHaveLength(0);
  });

  it('returns PASS for eligible response with empty reasons array', () => {
    const result = calculator.calculate(makeResponse(true, []));
    expect(result?.status).toBe(EligibilityStatus.PASS);
  });

  it('returns FLAG for eligible response that has borderline reasons', () => {
    const result = calculator.calculate(
      makeResponse(true, ['Smoker — note for prescriber']),
    );
    expect(result?.status).toBe(EligibilityStatus.FLAG);
    expect(result?.notes).toHaveLength(1);
  });

  it('returns FAIL for ineligible response', () => {
    const result = calculator.calculate(
      makeResponse(false, ['Has heart condition — disqualifying']),
    );
    expect(result?.status).toBe(EligibilityStatus.FAIL);
    expect(result?.notes[0]).toContain('heart condition');
  });

  it('returns FAIL with default message when no reasons provided on ineligible response', () => {
    const result = calculator.calculate(makeResponse(false, null));
    expect(result?.status).toBe(EligibilityStatus.FAIL);
    expect(result?.notes).toHaveLength(1);
  });
});
