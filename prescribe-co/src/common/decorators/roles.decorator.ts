import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Attach one or more required roles to a controller or route handler.
 * Evaluated by RolesGuard after JwtAuthGuard verifies the token.
 *
 * @example
 * @Roles(Role.PRESCRIBER, Role.ADMIN)
 * @Get('prescriptions/queue')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
