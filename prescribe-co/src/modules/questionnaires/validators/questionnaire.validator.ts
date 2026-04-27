import { BadRequestException, Injectable } from '@nestjs/common';
import {
  QuestionSchema,
  QuestionnaireSchema,
  QuestionType,
} from '../../../common/types/questionnaire-schema.types';

export interface ValidationResult {
  isEligible: boolean;
  ineligibilityReasons: string[];
  errors: Record<string, string>; // questionId → error message
}

/**
 * Server-side validator for questionnaire responses.
 *
 * Responsibilities:
 *   1. Ensure all required questions are answered.
 *   2. Type-check each answer against its question type.
 *   3. Validate choice answers against allowed option values.
 *   4. Enforce scale bounds.
 *   5. Evaluate conditional visibility (skip hidden questions).
 *   6. Compute eligibility by checking for disqualifying answers.
 *
 * This is intentionally a pure service (no DB dependency) so it can
 * also be called from unit tests and the prescription pre-flight check.
 */
@Injectable()
export class QuestionnaireValidator {
  /**
   * Validate a flat answers map against a questionnaire schema.
   * Throws BadRequestException if structural errors exist (wrong types, etc.).
   * Returns a ValidationResult with eligibility status.
   */
  validate(
    schema: QuestionnaireSchema,
    answers: Record<string, unknown>,
  ): ValidationResult {
    const errors: Record<string, string> = {};
    const ineligibilityReasons: string[] = [];

    // Build a visibility map — hidden questions are neither required nor scored
    const visibleIds = this.resolveVisibleQuestions(schema.questions, answers);

    for (const question of schema.questions) {
      if (!visibleIds.has(question.id)) continue;

      const answer = answers[question.id];

      // ── Required check ─────────────────────────────────────────────────
      if (question.isRequired && this.isEmpty(answer)) {
        errors[question.id] = `"${question.text}" is required`;
        continue;
      }

      if (this.isEmpty(answer)) continue; // optional and empty — skip

      // ── Type check ─────────────────────────────────────────────────────
      const typeError = this.validateType(question, answer);
      if (typeError) {
        errors[question.id] = typeError;
        continue;
      }

      // ── Eligibility check ──────────────────────────────────────────────
      const reason = this.checkDisqualifying(question, answer);
      if (reason) {
        ineligibilityReasons.push(reason);
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({
        message: 'Questionnaire response contains validation errors',
        errors,
      });
    }

    return {
      isEligible: ineligibilityReasons.length === 0,
      ineligibilityReasons,
      errors: {},
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Walk the question list and compute which questions are visible
   * given the current answer state. Supports single-pass evaluation
   * (assumes questions are sorted by sortOrder, dependencies before dependents).
   */
  private resolveVisibleQuestions(
    questions: QuestionSchema[],
    answers: Record<string, unknown>,
  ): Set<string> {
    const visible = new Set<string>();

    const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);

    for (const q of sorted) {
      if (!q.showIf) {
        visible.add(q.id);
        continue;
      }

      const { questionId, operator, value } = q.showIf;
      const parentAnswer = answers[questionId];

      if (this.evaluateCondition(operator, parentAnswer, value)) {
        visible.add(q.id);
      }
    }

    return visible;
  }

  private evaluateCondition(
    operator: string,
    actual: unknown,
    expected: unknown,
  ): boolean {
    switch (operator) {
      case 'eq':
        return String(actual) === String(expected);
      case 'neq':
        return String(actual) !== String(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  private validateType(
    question: QuestionSchema,
    answer: unknown,
  ): string | null {
    switch (question.type) {
      case QuestionType.TEXT:
        if (typeof answer !== 'string') return `"${question.text}" must be a text value`;
        break;

      case QuestionType.BOOLEAN:
        if (typeof answer !== 'boolean')
          return `"${question.text}" must be true or false`;
        break;

      case QuestionType.SINGLE_CHOICE: {
        if (typeof answer !== 'string')
          return `"${question.text}" must be a single selected value`;
        const allowed = question.options?.map((o) => o.value) ?? [];
        if (!allowed.includes(answer as string))
          return `"${question.text}" — "${answer}" is not a valid option`;
        break;
      }

      case QuestionType.MULTI_CHOICE: {
        if (!Array.isArray(answer))
          return `"${question.text}" must be an array of selected values`;
        const allowed = new Set(question.options?.map((o) => o.value) ?? []);
        const invalid = (answer as string[]).filter((v) => !allowed.has(v));
        if (invalid.length > 0)
          return `"${question.text}" — invalid options: ${invalid.join(', ')}`;
        break;
      }

      case QuestionType.SCALE: {
        if (typeof answer !== 'number' || !Number.isInteger(answer))
          return `"${question.text}" must be a whole number`;
        const { min, max } = question.scale ?? { min: 0, max: 10 };
        if (answer < min || answer > max)
          return `"${question.text}" must be between ${min} and ${max}`;
        break;
      }

      case QuestionType.DATE: {
        if (typeof answer !== 'string' || isNaN(Date.parse(answer)))
          return `"${question.text}" must be a valid date (ISO 8601)`;
        break;
      }
    }

    return null;
  }

  private checkDisqualifying(
    question: QuestionSchema,
    answer: unknown,
  ): string | null {
    if (!question.options) return null;

    const answeredValues = Array.isArray(answer) ? answer : [answer];

    for (const option of question.options) {
      if (option.disqualifying && answeredValues.includes(option.value)) {
        return `${question.text}: answered "${option.label}" which indicates this product may not be suitable`;
      }
    }

    return null;
  }

  private isEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }
}
