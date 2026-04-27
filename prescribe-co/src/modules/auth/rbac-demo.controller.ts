import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';

/**
 * RbacDemoController
 * ──────────────────
 * Illustrates how @Roles() and @CurrentUser() work together for each actor.
 * These stubs will be replaced by the real PrescriptionsController,
 * AdminController, etc. in subsequent implementation phases.
 *
 * Guard execution order (both registered globally in AppModule):
 *   1. JwtAuthGuard  → verifies Bearer token, populates request.user
 *   2. RolesGuard    → checks @Roles() metadata against request.user.role
 */
@Controller('demo')
export class RbacDemoController {
  // ── CUSTOMER routes ────────────────────────────────────────────────────────

  /**
   * Any authenticated user — no @Roles() means all roles are permitted.
   * Returns the caller's own basic profile.
   */
  @Get('my-dashboard')
  myDashboard(@CurrentUser() user: User) {
    return {
      message: `Welcome, ${user.fullName}`,
      role: user.role,
      userId: user.id,
    };
  }

  /**
   * CUSTOMER only — a customer accessing their own prescription history.
   */
  @Get('my-prescriptions')
  @Roles(Role.CUSTOMER)
  myPrescriptions(@CurrentUser() user: User) {
    return {
      message: 'Customer prescription list (stub)',
      customerId: user.id,
    };
  }

  // ── PRESCRIBER routes ──────────────────────────────────────────────────────

  /**
   * PRESCRIBER only — the review queue of submitted prescriptions.
   */
  @Get('prescriber/queue')
  @Roles(Role.PRESCRIBER)
  prescriberQueue(@CurrentUser() user: User) {
    return {
      message: 'Prescriptions awaiting clinical review (stub)',
      prescriberId: user.id,
    };
  }

  /**
   * PRESCRIBER only — approve a specific prescription.
   */
  @Patch('prescriber/prescriptions/:id/approve')
  @Roles(Role.PRESCRIBER)
  @HttpCode(HttpStatus.OK)
  approvePresciption(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() prescriber: User,
  ) {
    return {
      message: `Prescription ${id} approved (stub)`,
      approvedBy: prescriber.id,
    };
  }

  // ── DISPENSER routes ───────────────────────────────────────────────────────

  /**
   * DISPENSER only — approved prescriptions ready to be packaged and sent.
   */
  @Get('dispenser/queue')
  @Roles(Role.DISPENSER)
  dispenserQueue(@CurrentUser() user: User) {
    return {
      message: 'Approved prescriptions ready for dispensing (stub)',
      dispenserId: user.id,
    };
  }

  /**
   * DISPENSER only — mark a prescription as fulfilled and add tracking.
   */
  @Patch('dispenser/prescriptions/:id/fulfill')
  @Roles(Role.DISPENSER)
  @HttpCode(HttpStatus.OK)
  fulfillPrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() dispenser: User,
  ) {
    return {
      message: `Prescription ${id} marked as fulfilled (stub)`,
      dispensedBy: dispenser.id,
    };
  }

  // ── ADMIN routes ───────────────────────────────────────────────────────────

  /**
   * ADMIN only — system-wide audit log access.
   */
  @Get('admin/audit-logs')
  @Roles(Role.ADMIN)
  auditLogs(@CurrentUser() admin: User) {
    return {
      message: 'Audit log query (stub)',
      requestedBy: admin.id,
    };
  }

  /**
   * ADMIN + PRESCRIBER — both roles can view patient history.
   * Multiple roles in @Roles() use OR logic (any one is sufficient).
   */
  @Get('patients/:id/history')
  @Roles(Role.ADMIN, Role.PRESCRIBER)
  patientHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return {
      message: `Clinical history for patient ${id} (stub)`,
      accessedBy: actor.id,
      actorRole: actor.role,
    };
  }
}
