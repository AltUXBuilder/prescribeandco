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
 * RbacDemoController — development/testing stubs.
 * Remove before production deployment.
 */
@Controller('demo')
export class RbacDemoController {
  @Get('my-dashboard')
  myDashboard(@CurrentUser() user: User) {
    return { message: `Welcome, ${user.fullName}`, role: user.role, userId: user.id }
  }

  @Get('my-prescriptions')
  @Roles(Role.CUSTOMER)
  myPrescriptions(@CurrentUser() user: User) {
    return { message: 'Customer prescription list (stub)', customerId: user.id }
  }

  @Get('prescriber/queue')
  @Roles(Role.PRESCRIBER)
  prescriberQueue(@CurrentUser() user: User) {
    return { message: 'Prescriptions awaiting clinical review (stub)', prescriberId: user.id }
  }

  @Patch('prescriber/prescriptions/:id/approve')
  @Roles(Role.PRESCRIBER)
  @HttpCode(HttpStatus.OK)
  approvePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() prescriber: User,
  ) {
    return { message: `Prescription ${id} approved (stub)`, approvedBy: prescriber.id }
  }

  @Get('dispenser/queue')
  @Roles(Role.DISPENSER)
  dispenserQueue(@CurrentUser() user: User) {
    return { message: 'Approved prescriptions ready for dispensing (stub)', dispenserId: user.id }
  }

  @Patch('dispenser/prescriptions/:id/fulfill')
  @Roles(Role.DISPENSER)
  @HttpCode(HttpStatus.OK)
  fulfillPrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() dispenser: User,
  ) {
    return { message: `Prescription ${id} marked as fulfilled (stub)`, dispensedBy: dispenser.id }
  }

  @Get('admin/audit-logs')
  @Roles(Role.ADMIN)
  auditLogs(@CurrentUser() admin: User) {
    return { message: 'Audit log query (stub)', requestedBy: admin.id }
  }

  @Get('patients/:id/history')
  @Roles(Role.ADMIN, Role.PRESCRIBER)
  patientHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return { message: `Clinical history for patient ${id} (stub)`, accessedBy: actor.id, actorRole: actor.role }
  }
}
