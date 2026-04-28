import { Expose } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  QuestionOption,
  QuestionSchema,
  QuestionnaireSchema,
  QuestionType,
  ScaleBounds,
} from '../../../common/types/questionnaire-schema.types';

// ── Question option (nested in question DTO) ──────────────────────────────────

export class QuestionOptionDto implements QuestionOption {
  @IsString() @IsNotEmpty() @MaxLength(100) value: string;
  @IsString() @IsNotEmpty() @MaxLength(200) label: string;
  @IsOptional() @IsBoolean() disqualifying?: boolean;
}

export class ScaleBoundsDto implements ScaleBounds {
  @IsInt() @Min(0) min: number;
  @IsInt() max: number;
  @IsOptional() @IsString() @MaxLength(50) minLabel?: string;
  @IsOptional() @IsString() @MaxLength(50) maxLabel?: string;
}

// ── Question ──────────────────────────────────────────────────────────────────

export class QuestionSchemaDto implements Omit<QuestionSchema, 'id'> {
  /**
   * Client-provided stable ID (UUID v4).
   * Must remain stable across questionnaire versions so historic
   * response records can still be matched to their question.
   */
  @IsUUID('4')
  id: string;

  @IsEnum(QuestionType)
  type: QuestionType;

  @IsString() @IsNotEmpty() @MaxLength(500)
  text: string;

  @IsOptional() @IsString() @MaxLength(300)
  hint?: string;

  @IsBoolean()
  isRequired: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options?: QuestionOptionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ScaleBoundsDto)
  scale?: ScaleBoundsDto;

  @IsOptional()
  @IsObject()
  showIf?: { questionId: string; operator: 'eq' | 'neq' | 'in' | 'not_in'; value: string | string[] };

  @IsInt() @Min(0)
  sortOrder: number;
}

// ── Create questionnaire ──────────────────────────────────────────────────────

export class CreateQuestionnaireDto {
  @IsString() @IsNotEmpty() @MaxLength(200)
  title: string;

  @IsOptional() @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionSchemaDto)
  questions: QuestionSchemaDto[];
}

// ── Update questionnaire ──────────────────────────────────────────────────────

export class UpdateQuestionnaireDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200)
  title?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionSchemaDto)
  questions?: QuestionSchemaDto[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ── Submit responses ──────────────────────────────────────────────────────────

/**
 * Body for POST /questionnaires/:questionnaireId/respond
 * The answers map is validated against the live schema by QuestionnaireValidator.
 */
export class SubmitResponseDto {
  /**
   * Flat map of { questionId: answer }.
   * Type-checking per question type happens in the validator service,
   * not in class-validator (schema is dynamic).
   */
  @IsObject()
  answers: Record<string, unknown>;
}

// ── Response DTOs ─────────────────────────────────────────────────────────────

export class QuestionnaireResponseDto {
  @Expose() id: string;
  @Expose() title: string;
  @Expose() description: string | null;
  @Expose() schema: QuestionnaireSchema;
  @Expose() version: number;
  @Expose() isActive: boolean;
  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}

export class SubmitResponseResultDto {
  @Expose() id: string;
  @Expose() questionnaireId: string;
  @Expose() questionnaireVersion: number;
  @Expose() isEligible: boolean;
  @Expose() ineligibilityReasons: string[] | null;
  @Expose() submittedAt: Date;
}
