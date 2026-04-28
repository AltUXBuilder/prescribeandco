import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import {
  JwtAccessPayload,
  JwtRefreshPayload,
  TokensResponseDto,
} from './dto/auth.dto';
import { RegisterDto, RegisterPrescriberDto } from '../users/dto/users.dto';
import { AuditHelper } from '../audit/audit.helper';

const TOKEN_BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly auditHelper: AuditHelper,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  // ── Register ───────────────────────────────────────────────────────────────

  async registerCustomer(dto: RegisterDto): Promise<TokensResponseDto> {
    const user = await this.usersService.createCustomer(dto);
    await this.auditHelper.logUserRegistered(user.id, user.role, user.email);
    return this.issueTokens(user);
  }

  async registerPrescriber(
    dto: RegisterPrescriberDto,
    clientIp?: string,
    userAgent?: string,
  ): Promise<TokensResponseDto> {
    const user = await this.usersService.createPrescriber(dto);
    await this.auditHelper.logUserRegistered(user.id, user.role, user.email);
    return this.issueTokens(user, clientIp, userAgent);
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    clientIp?: string,
    userAgent?: string,
  ): Promise<{ user: User; tokens: TokensResponseDto }> {
    const user = await this.usersService.findByEmail(email);

    const isValid =
      user && (await this.usersService.verifyPassword(password, user.passwordHash));

    if (!user || !isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    await this.usersService.updateLastLogin(user.id);
    await this.auditHelper.logUserLogin(user.id, user.role, user.email);
    const tokens = await this.issueTokens(user, clientIp, userAgent);

    return { user, tokens };
  }

  // ── Refresh ────────────────────────────────────────────────────────────────

  async refresh(
    user: User,
    oldTokenRecord: RefreshToken,
    clientIp?: string,
    userAgent?: string,
  ): Promise<TokensResponseDto> {
    await this.refreshTokenRepo.update(oldTokenRecord.id, {
      revokedAt: new Date(),
    });
    await this.auditHelper.logTokenRefreshed(user.id);
    return this.issueTokens(user, clientIp, userAgent);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(jti: string, userId?: string): Promise<void> {
    await this.refreshTokenRepo.update({ jti }, { revokedAt: new Date() });
    if (userId) await this.auditHelper.logUserLogout(userId, jti);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revokedAt: undefined },
      { revokedAt: new Date() },
    );
    await this.auditHelper.logUserLogoutAll(userId);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async issueTokens(
    user: User,
    clientIp?: string,
    userAgent?: string,
  ): Promise<TokensResponseDto> {
    const jti = uuidv4();

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });

    const refreshJti = uuidv4();
    const refreshPayload: JwtRefreshPayload = { sub: user.id, jti: refreshJti };
    const refreshExpiresIn = this.config.get<string>('jwt.refreshExpiresIn') ?? '7d';

    const rawRefreshToken = this.jwtService.sign(refreshPayload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: refreshExpiresIn,
    });

    const tokenHash = await bcrypt.hash(rawRefreshToken, TOKEN_BCRYPT_ROUNDS);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const record = this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      jti: refreshJti,
      ipAddress: clientIp ?? null,
      userAgent: userAgent ?? null,
      expiresAt,
    });

    await this.refreshTokenRepo.save(record);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60,
    };
  }
}
