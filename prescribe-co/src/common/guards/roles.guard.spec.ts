import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildContext(userRole: Role | null, requiredRoles: Role[]): ExecutionContext {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
  } as unknown as Reflector;

  const mockContext = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { role: userRole } : undefined,
      }),
    }),
  } as unknown as ExecutionContext;

  return mockContext;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows access when no @Roles() are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const ctx = buildContext(Role.CUSTOMER, []);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.PRESCRIBER]);
    const ctx = buildContext(Role.PRESCRIBER, [Role.PRESCRIBER]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when user has one of multiple required roles', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue([Role.ADMIN, Role.PRESCRIBER]);
    const ctx = buildContext(Role.ADMIN, [Role.ADMIN, Role.PRESCRIBER]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when user lacks the required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = buildContext(Role.CUSTOMER, [Role.ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when user is absent from request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const ctx = buildContext(null, [Role.ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
