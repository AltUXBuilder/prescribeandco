import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtRefreshPayload } from '../dto/auth.dto';
import { RefreshToken } from '../../users/entities/refresh-token.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Validates the refresh token on POST /auth/refresh.
 * Extracts the raw token from the request body, verifies JWT signature,
 * then compares the hash against the stored record.
 *
 * Security properties:
 * - Refresh token rotation: each use issues a new token and revokes the old one
 * - Token hash comparison (bcrypt) — raw tokens are never stored
 * - Checks the token record's isValid() guard (expired / revoked)
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    payload: JwtRefreshPayload,
  ): Promise<{ user: User; tokenRecord: RefreshToken }> {
    const rawToken: string = req.body?.refreshToken;

    if (!rawToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    // Find the token record by jti (indexed lookup)
    const tokenRecord = await this.refreshTokenRepo.findOne({
      where: { jti: payload.jti },
      relations: ['user'],
    });

    if (!tokenRecord || !tokenRecord.isValid) {
      throw new UnauthorizedException('Refresh token is invalid or expired');
    }

    // Constant-time comparison via bcrypt
    const isMatch = await bcrypt.compare(rawToken, tokenRecord.tokenHash);
    if (!isMatch) {
      // Potential token theft — revoke all tokens for this user
      await this.refreshTokenRepo.update(
        { userId: tokenRecord.userId },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException(
        'Refresh token mismatch — all sessions revoked',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or deactivated');
    }

    return { user, tokenRecord };
  }
}
