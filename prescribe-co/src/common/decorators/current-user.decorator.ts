import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../modules/users/entities/user.entity';

/**
 * Extracts the authenticated user injected by JwtAuthGuard.
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() user: User) { ... }
 *
 * @example — extract a single field
 * @Get('me')
 * getId(@CurrentUser('id') id: string) { ... }
 */
export const CurrentUser = createParamDecorator(
  (field: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User = request.user;
    return field ? user?.[field] : user;
  },
);
