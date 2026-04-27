/**
 * Supported question types.
 * Drives both the frontend renderer and the server-side response validator.
 */
export enum QuestionType {
  TEXT          = 'TEXT',           // free-form string
  BOOLEAN       = 'BOOLEAN',        // true / false
  SINGLE_CHOICE = 'SINGLE_CHOICE',  // one value from options[]
  MULTI_CHOICE  = 'MULTI_CHOICE',   // one or more values from options[]
  SCALE         = 'SCALE',          // integer within [min, max]
  DATE          = 'DATE',           // ISO 8601 date string
}

/** A single selectable option within a SINGLE_CHOICE or MULTI_CHOICE question */
export interface QuestionOption {
  value: string;
  label: string;
  /** When true, selecting this option will flag the response as ineligible */
  disqualifying?: boolean;
}

/** Scale bounds for SCALE questions */
export interface ScaleBounds {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

/**
 * Conditional display rule.
 * The question is shown only when a prior question's answer matches.
 * Supported operators: eq, neq, in, not_in
 */
export interface ConditionalRule {
  questionId: string;
  operator: 'eq' | 'neq' | 'in' | 'not_in';
  value: string | string[];
}

/**
 * Full schema for a single question stored as JSON inside
 * the `questionnaires.schema` column (and embedded in QuestionnaireSchema).
 */
export interface QuestionSchema {
  id: string;             // stable UUID — used as the answer key
  type: QuestionType;
  text: string;
  hint?: string;          // helper text shown below the question
  isRequired: boolean;
  /** Populated for SINGLE_CHOICE and MULTI_CHOICE */
  options?: QuestionOption[];
  /** Populated for SCALE */
  scale?: ScaleBounds;
  /** If present, question is hidden until rule passes */
  showIf?: ConditionalRule;
  sortOrder: number;
}

/**
 * Top-level JSON schema stored in `questionnaires.schema`.
 * Versioned so historic responses can always be re-interpreted.
 */
export interface QuestionnaireSchema {
  version: number;
  questions: QuestionSchema[];
}
