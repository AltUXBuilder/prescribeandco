import { Injectable } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditAction } from './audit-action.enum';
import { auditContextStorage } from './interceptors/audit.interceptor';

/**
 * AuditHelper
 * ───────────
 * Thin wrapper used by every feature service.
 *
 * Responsibilities:
 *   1. Reads actorId, ipAddress, userAgent from AsyncLocalStorage
 *      (populated by AuditInterceptor on every request)
 *   2. Provides typed convenience methods per domain so call sites
 *      don't have to know about entityType strings or context plumbing
 *   3. Delegates to AuditService.log() which is the append-only writer
 *
 * Why a separate helper and not just AuditService?
 * AuditService is @Global and injected everywhere — adding domain-specific
 * helpers there would bloat it. AuditHelper keeps domain helpers co-located
 * with the audit module without polluting AuditService.
 */
@Injectable()
export class AuditHelper {
  constructor(private readonly auditService: AuditService) {}

  // ── Low-level generic log ───────────────────────────────────────────────────

  async log(params: {
    actorId?: string | null;
    actorRole?: string | null;
    gphcNumber?: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown> | null;
    after?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void> {
    const ctx = auditContextStorage.getStore();
    await this.auditService.log({
      actorId:     params.actorId   ?? ctx?.actorId ?? null,
      actorRole:   params.actorRole ?? null,
      gphcNumber:  params.gphcNumber ?? null,
      action:      params.action,
      entityType:  params.entityType,
      entityId:    params.entityId,
      beforeState: params.before ?? null,
      afterState:  params.after  ?? null,
      metadata:    params.metadata ?? null,
      ipAddress:   ctx?.ipAddress  ?? null,
      userAgent:   ctx?.userAgent  ?? null,
    });
  }

  // ── User domain ─────────────────────────────────────────────────────────────

  async logUserRegistered(userId: string, role: string, email: string): Promise<void> {
    await this.log({
      actorId: userId,
      actorRole: role,
      action: AuditAction.USER_REGISTERED,
      entityType: 'users',
      entityId: userId,
      after: { email, role },
    });
  }

  async logUserLogin(userId: string, role: string, email: string): Promise<void> {
    await this.log({
      actorId: userId,
      actorRole: role,
      action: AuditAction.USER_LOGIN,
      entityType: 'users',
      entityId: userId,
      metadata: { email },
    });
  }

  async logUserLogout(userId: string, jti: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: AuditAction.USER_LOGOUT,
      entityType: 'users',
      entityId: userId,
      metadata: { jti },
    });
  }

  async logUserLogoutAll(userId: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: AuditAction.USER_LOGOUT_ALL,
      entityType: 'users',
      entityId: userId,
    });
  }

  async logTokenRefreshed(userId: string): Promise<void> {
    await this.log({
      actorId: userId,
      action: AuditAction.USER_TOKEN_REFRESHED,
      entityType: 'users',
      entityId: userId,
    });
  }

  async logRoleChanged(
    adminId: string,
    targetUserId: string,
    previousRole: string,
    newRole: string,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.USER_ROLE_CHANGED,
      entityType: 'users',
      entityId: targetUserId,
      before: { role: previousRole },
      after:  { role: newRole },
      metadata: { changedBy: adminId, previousRole, newRole },
    });
  }

  async logUserDeactivated(adminId: string, targetUserId: string): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.USER_DEACTIVATED,
      entityType: 'users',
      entityId: targetUserId,
      metadata: { deactivatedBy: adminId },
    });
  }

  // ── Prescription domain ─────────────────────────────────────────────────────

  async logPrescriptionDraftCreated(
    customerId: string,
    prescriptionId: string,
    productId: string,
  ): Promise<void> {
    await this.log({
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: AuditAction.PRESCRIPTION_DRAFT_CREATED,
      entityType: 'prescription_requests',
      entityId: prescriptionId,
      after: { status: 'DRAFT', productId },
    });
  }

  async logQuestionnaireAttached(
    customerId: string,
    prescriptionId: string,
    questionnaireResponseId: string,
  ): Promise<void> {
    await this.log({
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: AuditAction.PRESCRIPTION_QUESTIONNAIRE_ATTACHED,
      entityType: 'prescription_requests',
      entityId: prescriptionId,
      metadata: { questionnaireResponseId },
    });
  }

  async logPrescriptionSubmitted(
    customerId: string,
    prescriptionId: string,
    eligibilityStatus: string | null,
  ): Promise<void> {
    await this.log({
      actorId: customerId,
      actorRole: 'CUSTOMER',
      action: AuditAction.PRESCRIPTION_SUBMITTED,
      entityType: 'prescription_requests',
      entityId: prescriptionId,
      after: { status: 'SUBMITTED', eligibilityStatus },
    });
  }

  async logPrescriptionCancelled(
    actorId: string,
    actorRole: string,
    prescriptionId: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      actorId,
      actorRole,
      action: AuditAction.PRESCRIPTION_CANCELLED,
      entityType: 'prescription_requests',
      entityId: prescriptionId,
      after: { status: 'CANCELLED' },
      metadata: { reason },
    });
  }

  // ── Product domain ──────────────────────────────────────────────────────────

  async logProductCreated(
    adminId: string,
    productId: string,
    productData: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.PRODUCT_CREATED,
      entityType: 'products',
      entityId: productId,
      after: productData,
    });
  }

  async logProductUpdated(
    adminId: string,
    productId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.PRODUCT_UPDATED,
      entityType: 'products',
      entityId: productId,
      before,
      after,
    });
  }

  async logProductArchived(adminId: string, productId: string, productName: string): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.PRODUCT_ARCHIVED,
      entityType: 'products',
      entityId: productId,
      after: { status: 'ARCHIVED' },
      metadata: { productName },
    });
  }

  async logProductQuestionnaireAssigned(
    adminId: string,
    productId: string,
    questionnaireId: string | null,
    previous: string | null,
  ): Promise<void> {
    const action = questionnaireId
      ? AuditAction.PRODUCT_QUESTIONNAIRE_ASSIGNED
      : AuditAction.PRODUCT_QUESTIONNAIRE_REMOVED;
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action,
      entityType: 'products',
      entityId: productId,
      before: { questionnaireId: previous },
      after:  { questionnaireId },
    });
  }

  // ── Questionnaire domain ────────────────────────────────────────────────────

  async logQuestionnaireCreated(
    adminId: string,
    questionnaireId: string,
    title: string,
    questionCount: number,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.QUESTIONNAIRE_CREATED,
      entityType: 'questionnaires',
      entityId: questionnaireId,
      after: { title, questionCount, version: 1 },
    });
  }

  async logQuestionnaireUpdated(
    adminId: string,
    questionnaireId: string,
    previousVersion: number,
    newVersion: number,
    changedFields: string[],
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.QUESTIONNAIRE_UPDATED,
      entityType: 'questionnaires',
      entityId: questionnaireId,
      before: { version: previousVersion },
      after:  { version: newVersion },
      metadata: { changedFields },
    });
  }

  async logQuestionnaireDeactivated(
    adminId: string,
    questionnaireId: string,
    title: string,
  ): Promise<void> {
    await this.log({
      actorId: adminId,
      actorRole: 'ADMIN',
      action: AuditAction.QUESTIONNAIRE_DEACTIVATED,
      entityType: 'questionnaires',
      entityId: questionnaireId,
      after: { isActive: false },
      metadata: { title },
    });
  }

  async logQuestionnaireResponseSubmitted(
    userId: string,
    responseId: string,
    questionnaireId: string,
    isEligible: boolean | null,
  ): Promise<void> {
    await this.log({
      actorId: userId,
      actorRole: 'CUSTOMER',
      action: AuditAction.QUESTIONNAIRE_RESPONSE_SUBMITTED,
      entityType: 'questionnaire_responses',
      entityId: responseId,
      after: { questionnaireId, isEligible },
    });
  }

  // ── Document domain ─────────────────────────────────────────────────────────

  async logDocumentUploaded(
    uploaderId: string,
    documentId: string,
    prescriptionId: string,
    documentType: string,
    filename: string,
  ): Promise<void> {
    await this.log({
      actorId: uploaderId,
      actorRole: 'CUSTOMER',
      action: AuditAction.DOCUMENT_UPLOADED,
      entityType: 'prescription_documents',
      entityId: documentId,
      after: { prescriptionId, documentType, filename },
    });
  }

  async logDocumentDeleted(
    actorId: string,
    documentId: string,
    prescriptionId: string,
    filename: string,
  ): Promise<void> {
    await this.log({
      actorId,
      action: AuditAction.DOCUMENT_DELETED,
      entityType: 'prescription_documents',
      entityId: documentId,
      before: { prescriptionId, filename },
    });
  }

  async logDocumentScanCompleted(
    documentId: string,
    scanStatus: string,
    filename: string,
  ): Promise<void> {
    await this.log({
      actorId: null, // system event
      action: AuditAction.DOCUMENT_SCAN_COMPLETED,
      entityType: 'prescription_documents',
      entityId: documentId,
      after: { scanStatus, filename },
    });
  }
}
