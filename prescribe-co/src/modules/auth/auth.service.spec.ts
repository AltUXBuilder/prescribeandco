import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RefreshToken } from '../users/entities/refresh-token.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../../common/enums/role.enum';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUser: Partial<User> = {
  id: 'test-uuid-1234',
  email: 'customer@test.com',
  passwordHash: 'hashed_password',
  role: Role.CUSTOMER,
  firstName: 'Jane',
  lastName: 'Smith',
  isActive: true,
};

const mockRefreshTokenRepo = {
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  findOne: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  verifyPassword: jest.fn(),
  updateLastLogin: jest.fn(),
  createCustomer: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const map: Record<string, string | number> = {
      'jwt.accessSecret': 'test_access_secret',
      'jwt.accessExpiresIn': '15m',
      'jwt.refreshSecret': 'test_refresh_secret',
      'jwt.refreshExpiresIn': '7d',
    };
    return map[key];
  }),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('returns user and tokens on valid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.verifyPassword.mockResolvedValue(true);
      mockUsersService.updateLastLogin.mockResolvedValue(undefined);
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login('customer@test.com', 'ValidPass1!');

      expect(result.user).toBeDefined();
      expect(result.tokens.accessToken).toBeDefined();
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(mockUser.id);
    });

    it('throws UnauthorizedException for unknown email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login('unknown@test.com', 'Password1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for wrong password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.verifyPassword.mockResolvedValue(false);

      await expect(
        service.login('customer@test.com', 'WrongPassword1!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException for deactivated account', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });
      mockUsersService.verifyPassword.mockResolvedValue(true);

      await expect(
        service.login('customer@test.com', 'ValidPass1!'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the refresh token by jti', async () => {
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 1 });

      await service.logout('some-jti-value');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { jti: 'some-jti-value' },
        { revokedAt: expect.any(Date) },
      );
    });
  });

  describe('logoutAll', () => {
    it('revokes all tokens for a user', async () => {
      mockRefreshTokenRepo.update.mockResolvedValue({ affected: 3 });

      await service.logoutAll('test-uuid-1234');

      expect(mockRefreshTokenRepo.update).toHaveBeenCalledWith(
        { userId: 'test-uuid-1234', revokedAt: undefined },
        { revokedAt: expect.any(Date) },
      );
    });
  });
});
