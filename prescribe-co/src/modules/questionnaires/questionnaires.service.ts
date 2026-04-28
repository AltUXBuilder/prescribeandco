import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Questionnaire } from './entities/questionnaire.entity';
import { QuestionnaireResponse } from './entities/questionnaire-response.entity';
import {
  CreateQuestionnaireDto,
  UpdateQuestionnaireDto,
} from './dto/questionnaires.dto';
import { QuestionnaireValidator } from './validators/questionnaire.validator';
import { QuestionnaireSchema } from '../../common/types/questionnaire-schema.types';
import { AuditHelper } from '../audit/audit.helper';

@Injectable()
export class QuestionnairesService {
  constructor(
    @InjectRepository(Questionnaire)
    private readonly questionnaireRepo: Repository<Questionnaire>,

    @InjectRepository(QuestionnaireResponse)
    private readonly responseRepo: Repository<QuestionnaireResponse>,

    private readonly validator: QuestionnaireValidator,
    private readonly auditHelper: AuditHelper,
  ) {}

  // ── Admin: CRUD ────────────────────────────────────────────────────────────

  async create(dto: CreateQuestionnaireDto, createdBy: string): Promise<Questionnaire> {
    this.assertNoDuplicateQuestionIds(dto.questions.map((q) => q.id));

    const schema: QuestionnaireSchema = {
      version: 1,
      questions: dto.questions,
    };

    const questionnaire = this.questionnaireRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      schema,
      version: 1,
      isActive: true,
      createdBy,
    });

    const saved = await this.questionnaireRepo.save(questionnaire);

    await this.auditHelper.logQuestionnaireCreated(
      createdBy,
      saved.id,
      saved.title,
      dto.questions.length,
    );

    return saved;
  }

  async update(id: string, dto: UpdateQuestionnaireDto, adminId: string): Promise<Questionnaire> {
    const questionnaire = await this.findById(id);
    const previousVersion = questionnaire.version;
    const changedFields: string[] = [];

    if (dto.title !== undefined) { questionnaire.title = dto.title; changedFields.push('title'); }
    if (dto.description !== undefined) { questionnaire.description = dto.description; changedFields.push('description'); }
    if (dto.isActive !== undefined) { questionnaire.isActive = dto.isActive; changedFields.push('isActive'); }

    if (dto.questions !== undefined) {
      this.assertNoDuplicateQuestionIds(dto.questions.map((q) => q.id));
      const newVersion = questionnaire.version + 1;
      questionnaire.version = newVersion;
      questionnaire.schema = { version: newVersion, questions: dto.questions };
      changedFields.push('schema');
    }

    const saved = await this.questionnaireRepo.save(questionnaire);

    await this.auditHelper.logQuestionnaireUpdated(
      adminId,
      id,
      previousVersion,
      saved.version,
      changedFields,
    );

    return saved;
  }

  async deactivate(id: string, adminId: string): Promise<Questionnaire> {
    const questionnaire = await this.findById(id);
    questionnaire.isActive = false;
    const saved = await this.questionnaireRepo.save(questionnaire);
    await this.auditHelper.logQuestionnaireDeactivated(adminId, id, questionnaire.title);
    return saved;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<Questionnaire> {
    const q = await this.questionnaireRepo.findOne({ where: { id } });
    if (!q) throw new NotFoundException(`Questionnaire ${id} not found`);
    return q;
  }

  async findAll(): Promise<Questionnaire[]> {
    return this.questionnaireRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findActive(): Promise<Questionnaire[]> {
    return this.questionnaireRepo.find({
      where: { isActive: true },
      order: { title: 'ASC' },
    });
  }

  // ── Response submission ────────────────────────────────────────────────────

  async submitResponse(
    questionnaireId: string,
    userId: string,
    answers: Record<string, unknown>,
  ): Promise<QuestionnaireResponse> {
    const questionnaire = await this.findById(questionnaireId);

    if (!questionnaire.isActive) {
      throw new BadRequestException('This questionnaire is no longer active');
    }

    const result = this.validator.validate(questionnaire.schema, answers);

    const response = this.responseRepo.create({
      userId,
      questionnaireId,
      questionnaireVersion: questionnaire.version,
      answers,
      isEligible: result.isEligible,
      ineligibilityReasons: result.ineligibilityReasons.length > 0
        ? result.ineligibilityReasons
        : null,
    });

    const saved = await this.responseRepo.save(response);

    await this.auditHelper.logQuestionnaireResponseSubmitted(
      userId,
      saved.id,
      questionnaireId,
      saved.isEligible,
    );

    return saved;
  }

  async findResponseById(id: string): Promise<QuestionnaireResponse> {
    const response = await this.responseRepo.findOne({ where: { id } });
    if (!response) throw new NotFoundException(`Response ${id} not found`);
    return response;
  }

  async findLatestEligibleResponse(
    userId: string,
    questionnaireId: string,
  ): Promise<QuestionnaireResponse | null> {
    return this.responseRepo.findOne({
      where: { userId, questionnaireId, isEligible: true },
      order: { submittedAt: 'DESC' },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private assertNoDuplicateQuestionIds(ids: string[]): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new BadRequestException(
          `Duplicate question ID "${id}" — each question must have a unique UUID`,
        );
      }
      seen.add(id);
    }
  }
}
