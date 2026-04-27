import { Expose } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';
import { UserResponseDto } from '../../users/dto/users.dto';

// ── Login ─────────────────────────────────────────────────────────────────

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

// ── Refresh token ─────────────────────────────────────────────────────────

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

// ── Token payload (JWT claims) ────────────────────────────────────────────

export interface JwtAccessPayload {
  /** Subject — user UUID */
  sub: string;
  email: string;
  role: string;
  /** JWT ID — used for blacklisting */
  jti: string;
  /** Issued at */
  iat?: number;
  /** Expiry */
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  jti: string;
  iat?: number;
  exp?: number;
}

// ── Responses ─────────────────────────────────────────────────────────────

export class TokensResponseDto {
  @Expose() accessToken: string;
  @Expose() refreshToken: string;
  @Expose() expiresIn: number;
}

export class AuthResponseDto {
  @Expose() user: UserResponseDto;
  @Expose() tokens: TokensResponseDto;
}
