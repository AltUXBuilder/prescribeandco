import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible (no JWT required).
 * JwtAuthGuard checks for this metadata before attempting verification.
 *
 * @example
 * @Public()
 * @Post('auth/login')
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
