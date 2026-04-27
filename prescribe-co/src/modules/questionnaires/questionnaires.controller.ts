import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { QuestionnairesService } from './questionnaires.service';
import {
  CreateQuestionnaireDto,
  QuestionnaireResponseDto,
  SubmitResponseDto,
  SubmitResponseResultDto,
  UpdateQuestionnaireDto,
} from './dto/questionnaires.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Role } from '../../common/enums/role.enum';
import { plainToInstance } from 'class-transformer';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('questionnaires')
export class QuestionnairesController {
  constructor(private readonly questionnairesService: QuestionnairesService) {}

  // ── Admin: CRUD ────────────────────────────────────────────────────────────

  /**
   * POST /questionnaires
   * ADMIN only — create a new questionnaire with its full question schema.
   */
  @Post()
  @Roles(Role.ADMIN)
  async create(
    @Body() dto: CreateQuestionnaireDto,
    @CurrentUser('id') adminId: string,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.questionnairesService.create(dto, adminId);
    return plainToInstance(QuestionnaireResponseDto, questionnaire, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * GET /questionnaires
   * ADMIN only — list all questionnaires (active and inactive).
   */
  @Get()
  @Roles(Role.ADMIN)
  async findAll(): Promise<QuestionnaireResponseDto[]> {
    const questionnaires = await this.questionnairesService.findAll();
    return questionnaires.map((q) =>
      plainToInstance(QuestionnaireResponseDto, q, {
        excludeExtraneousValues: true,
      }),
    );
  }

  /**
   * GET /questionnaires/:id
   * ADMIN + PRESCRIBER — prescribers need to view schemas during clinical review.
   */
  @Get(':id')
  @Roles(Role.ADMIN, Role.PRESCRIBER)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.questionnairesService.findById(id);
    return plainToInstance(QuestionnaireResponseDto, questionnaire, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * PATCH /questionnaires/:id
   * ADMIN only — update schema or metadata. Bumps version if questions change.
   */
  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionnaireDto,
    @CurrentUser('id') adminId: string,
  ): Promise<QuestionnaireResponseDto> {
    const questionnaire = await this.questionnairesService.update(id, dto, adminId);
    return plainToInstance(QuestionnaireResponseDto, questionnaire, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * DELETE /questionnaires/:id
   * ADMIN only — soft-deactivate; does not hard-delete (preserves historic responses).
   */
  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') adminId: string,
  ): Promise<void> {
    await this.questionnairesService.deactivate(id, adminId);
  }

  // ── Customer: submit ───────────────────────────────────────────────────────

  /**
   * POST /questionnaires/:id/respond
   * CUSTOMER — submit answers. Returns eligibility result immediately.
   * The response ID is then passed when creating a prescription request.
   */
  @Post(':id/respond')
  @Roles(Role.CUSTOMER)
  async submitResponse(
    @Param('id', ParseUUIDPipe) questionnaireId: string,
    @Body() dto: SubmitResponseDto,
    @CurrentUser('id') userId: string,
  ): Promise<SubmitResponseResultDto> {
    const response = await this.questionnairesService.submitResponse(
      questionnaireId,
      userId,
      dto.answers,
    );
    return plainToInstance(SubmitResponseResultDto, response, {
      excludeExtraneousValues: true,
    });
  }
}
