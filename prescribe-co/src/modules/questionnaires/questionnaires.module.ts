import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Questionnaire } from './entities/questionnaire.entity';
import { QuestionnaireResponse } from './entities/questionnaire-response.entity';
import { QuestionnairesService } from './questionnaires.service';
import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnaireValidator } from './validators/questionnaire.validator';

@Module({
  imports: [TypeOrmModule.forFeature([Questionnaire, QuestionnaireResponse])],
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService, QuestionnaireValidator],
  exports: [QuestionnairesService, QuestionnaireValidator],
})
export class QuestionnairesModule {}
