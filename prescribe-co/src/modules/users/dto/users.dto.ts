import { Expose, Type } from 'class-transformer';
import {
  IsDate,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';

// ── Register ────────────────────────────────────────────────────────────────

export class RegisterDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(254)
  email: string;

  /**
   * Password rules (NCSC guidance):
   * - Minimum 10 characters
   * - At least one uppercase, one lowercase, one digit, one special character
   */
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/,
    {
      message:
        'Password must contain uppercase, lowercase, a number, and a special character',
    },
  )
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  /** Optional — customers may supply for NHS exemption checking */
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'NHS number must be exactly 10 digits' })
  nhsNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;
}

// ── Register as Prescriber ───────────────────────────────────────────────────

export class RegisterPrescriberDto extends RegisterDto {
  /** 7-digit GPhC registration number — mandatory for prescribers */
  @Matches(/^\d{7}$/, { message: 'GPhC number must be exactly 7 digits' })
  gphcNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specialisation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organisation?: string;
}

// ── Admin: update role ───────────────────────────────────────────────────────

export class UpdateUserRoleDto {
  @IsEnum(Role)
  role: Role;
}

// ── Response ─────────────────────────────────────────────────────────────────

/**
 * Safe user response — strips passwordHash via ClassSerializerInterceptor.
 * Uses @Expose() so only explicitly listed fields are included.
 */
export class UserResponseDto {
  @Expose() id: string;
  @Expose() email: string;
  @Expose() role: Role;
  @Expose() firstName: string;
  @Expose() lastName: string;
  @Expose() nhsNumber: string | null;
  @Expose() phone: string | null;
  @Expose() isVerified: boolean;
  @Expose() isActive: boolean;
  @Expose() createdAt: Date;
}
