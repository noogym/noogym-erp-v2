import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createContext(role?: UserRole) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: role ? { role } : undefined,
      }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  it('allows requests when no roles are required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows users with a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(createContext(UserRole.ADMIN))).toBe(true);
  });

  it('blocks users without a required role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const guard = new RolesGuard(reflector as unknown as Reflector);

    expect(guard.canActivate(createContext(UserRole.TRAINER))).toBe(false);
  });
});
