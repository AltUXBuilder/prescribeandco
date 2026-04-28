import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PrescriberProfile } from '../users/entities/prescriber-profile.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

/**
 * PrescriberGuard
 * ───────────────
 * Applied to all clinical action routes (approve, reject, request more info).
 * Runs AFTER JwtAuthGuard and RolesGuard have confirmed the user is a PRESCRIBER.
 *
 * Additionally verifies:
 *   1. The prescriber has a GPhC profile record
 *   2. gphcVerified = true (manually set by admin after GPhC register check)
 *   3. Indemnity insurance has not expired (when indemnityExpiry is set)
 *
 * This ensures no clinical decision can be made by an unverified or expired prescriber.
 */
@Injectable()
export class PrescriberGuard implements CanActivate {
  constructor(
    @InjectRepository(PrescriberProfile)
    private readonly profileRepo: Repository<PrescriberProfile>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { user }: { user: User } = context.switchToHttp().getRequest();

    if (!user || user.role !== Role.PRESCRIBER) {
      // RolesGuard should have caught this — belt and braces
      throw new ForbiddenException('This route requires PRESCRIBER role');
    }

    const profile = await this.profileRepo.findOne({
      where: { userId: user.id },
    });

    if (!profile) {
      throw new ForbiddenException(
        'No GPhC profile found for this prescriber account. Contact an administrator.',
      );
    }

    if (!profile.gphcVerified) {
      throw new ForbiddenException(
        `GPhC registration ${profile.gphcNumber} has not been verified. ` +
          'Clinical actions are blocked until verification is complete.',
      );
    }

    if (profile.indemnityExpiry && profile.indemnityExpiry < new Date()) {
      throw new ForbiddenException(
        `Indemnity insurance expired on ${profile.indemnityExpiry.toISOString().split('T')[0]}. ` +
          'Please update your indemnity details before making clinical decisions.',
      );
    }

    // Attach profile to request for downstream use (avoids a second DB lookup)
    (context.switchToHttp().getRequest() as any).prescriberProfile = profile;

    return true;
  }
}
