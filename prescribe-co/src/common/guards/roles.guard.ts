import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Enforces @Roles() metadata on routes.
 * Must be applied AFTER JwtAuthGuard has populated request.user.
 * Throws 403 Forbidden (not 401) when a valid user lacks the required role.
 *
 * Applied globally via APP_GUARD in AppModule — runs on every request.
 * Routes without @Roles() are accessible by any authenticated user.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() on this route — any authenticated user may access it
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user }: { user: User } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Role '${user.role}' is not authorised to access this resource. ` +
          `Required: ${requiredRoles.join(' | ')}`,
      );
    }

    return true;
  }
}
