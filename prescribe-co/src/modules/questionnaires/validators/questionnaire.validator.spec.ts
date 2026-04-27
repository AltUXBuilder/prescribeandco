import { BadRequestException } from '@nestjs/common';
import { QuestionnaireValidator } from './questionnaire.validator';
import {
  QuestionnaireSchema,
  QuestionType,
} from '../../../common/types/questionnaire-schema.types';

const baseSchema: QuestionnaireSchema = {
  version: 1,
  questions: [
    {
      id: 'q-bool-1',
      type: QuestionType.BOOLEAN,
      text: 'Are you over 18?',
      isRequired: true,
      sortOrder: 0,
    },
    {
      id: 'q-choice-1',
      type: QuestionType.SINGLE_CHOICE,
      text: 'Do you have any heart conditions?',
      isRequired: true,
      options: [
        { value: 'yes', label: 'Yes', disqualifying: true },
        { value: 'no',  label: 'No' },
      ],
      sortOrder: 1,
    },
    {
      id: 'q-text-1',
      type: QuestionType.TEXT,
      text: 'Describe your symptoms',
      isRequired: false,
      sortOrder: 2,
    },
    {
      id: 'q-conditional-1',
      type: QuestionType.TEXT,
      text: 'Which heart condition?',
      isRequired: true,
      showIf: { questionId: 'q-choice-1', operator: 'eq', value: 'yes' },
      sortOrder: 3,
    },
    {
      id: 'q-scale-1',
      type: QuestionType.SCALE,
      text: 'Rate your pain (1–10)',
      isRequired: true,
      scale: { min: 1, max: 10 },
      sortOrder: 4,
    },
  ],
};

describe('QuestionnaireValidator', () => {
  let validator: QuestionnaireValidator;

  beforeEach(() => {
    validator = new QuestionnaireValidator();
  });

  describe('valid submissions', () => {
    it('accepts a fully valid response', () => {
      const result = validator.validate(baseSchema, {
        'q-bool-1': true,
        'q-choice-1': 'no',
        'q-text-1': 'mild cough',
        'q-scale-1': 5,
      });

      expect(result.isEligible).toBe(true);
      expect(result.ineligibilityReasons).toHaveLength(0);
      expect(result.errors).toEqual({});
    });

    it('skips optional questions when empty', () => {
      const result = validator.validate(baseSchema, {
        'q-bool-1': true,
        'q-choice-1': 'no',
        'q-scale-1': 3,
        // q-text-1 omitted — optional
      });
      expect(result.isEligible).toBe(true);
    });

    it('skips conditional questions when parent condition is unmet', () => {
      // q-conditional-1 is only shown when q-choice-1 === 'yes'
      const result = validator.validate(baseSchema, {
        'q-bool-1': true,
        'q-choice-1': 'no', // condition NOT met
        'q-scale-1': 7,
        // q-conditional-1 NOT provided — should be skipped
      });
      expect(result.isEligible).toBe(true);
    });
  });

  describe('eligibility', () => {
    it('marks as ineligible when a disqualifying option is selected', () => {
      const result = validator.validate(baseSchema, {
        'q-bool-1': true,
        'q-choice-1': 'yes',     // disqualifying
        'q-conditional-1': 'Angina',
        'q-scale-1': 4,
      });

      expect(result.isEligible).toBe(false);
      expect(result.ineligibilityReasons.length).toBeGreaterThan(0);
      expect(result.ineligibilityReasons[0]).toContain('heart conditions');
    });
  });

  describe('validation errors', () => {
    it('throws BadRequestException when a required question is missing', () => {
      expect(() =>
        validator.validate(baseSchema, {
          // q-bool-1 missing
          'q-choice-1': 'no',
          'q-scale-1': 5,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException for wrong boolean type', () => {
      expect(() =>
        validator.validate(baseSchema, {
          'q-bool-1': 'yes',   // string instead of boolean
          'q-choice-1': 'no',
          'q-scale-1': 5,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException for invalid choice value', () => {
      expect(() =>
        validator.validate(baseSchema, {
          'q-bool-1': true,
          'q-choice-1': 'maybe',   // not in options
          'q-scale-1': 5,
        }),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException for scale value out of bounds', () => {
      expect(() =>
        validator.validate(baseSchema, {
          'q-bool-1': true,
          'q-choice-1': 'no',
          'q-scale-1': 11,   // max is 10
        }),
      ).toThrow(BadRequestException);
    });

    it('includes all field errors in the exception', () => {
      try {
        validator.validate(baseSchema, {
          'q-bool-1': 'wrong-type',
          'q-choice-1': 'invalid',
          'q-scale-1': 999,
        });
        fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(BadRequestException);
        const body = (err as BadRequestException).getResponse() as any;
        expect(Object.keys(body.errors).length).toBeGreaterThanOrEqual(3);
      }
    });
  });

  describe('multi-choice', () => {
    const multiSchema: QuestionnaireSchema = {
      version: 1,
      questions: [
        {
          id: 'q-multi-1',
          type: QuestionType.MULTI_CHOICE,
          text: 'Which medications are you taking?',
          isRequired: true,
          options: [
            { value: 'warfarin', label: 'Warfarin', disqualifying: true },
            { value: 'aspirin',  label: 'Aspirin' },
            { value: 'none',     label: 'None of the above' },
          ],
          sortOrder: 0,
        },
      ],
    };

    it('accepts valid multi-choice answers', () => {
      const result = validator.validate(multiSchema, {
        'q-multi-1': ['aspirin'],
      });
      expect(result.isEligible).toBe(true);
    });

    it('disqualifies when a disqualifying option is in array', () => {
      const result = validator.validate(multiSchema, {
        'q-multi-1': ['warfarin', 'aspirin'],
      });
      expect(result.isEligible).toBe(false);
    });

    it('rejects non-array answers', () => {
      expect(() =>
        validator.validate(multiSchema, { 'q-multi-1': 'aspirin' }),
      ).toThrow(BadRequestException);
    });
  });
});
