import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function createPrismaMock() {
  return {
    appointment: {
      findMany: jest.fn(),
    },
    cashSession: {
      findMany: jest.fn(),
    },
    employee: {
      findMany: jest.fn(),
    },
    gymClass: {
      findMany: jest.fn(),
    },
    member: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
    product: {
      findMany: jest.fn(),
    },
    sale: {
      findMany: jest.fn(),
    },
    subscription: {
      findMany: jest.fn(),
    },
    userGym: {
      findMany: jest.fn(),
    },
  };
}

function createContext(
  user?: {
    sub?: string;
    role?: UserRole;
    organizationId?: string;
  },
  request: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    params?: Record<string, unknown>;
  } = {},
  controllerName = 'MembersController',
) {
  const httpRequest = {
    user,
    query: request.query ?? {},
    body: request.body ?? {},
    params: request.params ?? {},
  };

  return {
    getHandler: jest.fn(),
    getClass: jest.fn().mockReturnValue({ name: controllerName }),
    switchToHttp: () => ({
      getRequest: () => httpRequest,
    }),
    httpRequest,
  } as any;
}

describe('RolesGuard', () => {
  it('allows requests when no roles are required', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const prisma = createPrismaMock();
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
  });

  it('allows users with a required role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const prisma = createPrismaMock();
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext({
          sub: 'user-1',
          role: UserRole.ADMIN,
          organizationId: 'org-1',
        }),
      ),
    ).resolves.toBe(true);
    expect(prisma.userGym.findMany).not.toHaveBeenCalled();
  });

  it('blocks users without a required role', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    };
    const prisma = createPrismaMock();
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext({
          sub: 'user-1',
          role: UserRole.TRAINER,
          organizationId: 'org-1',
        }),
      ),
    ).resolves.toBe(false);
  });

  it('blocks limited users from referencing another gym', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.RECEPTIONIST]),
    };
    const prisma = createPrismaMock();
    prisma.userGym.findMany.mockResolvedValue([{ gymId: 'gym-1' }]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext(
          {
            sub: 'user-1',
            role: UserRole.RECEPTIONIST,
            organizationId: 'org-1',
          },
          { body: { gymId: 'gym-2' } },
        ),
      ),
    ).rejects.toThrow('Acesso ao recurso nao autorizado');
  });

  it('allows limited users to reference members from their gyms', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.RECEPTIONIST]),
    };
    const prisma = createPrismaMock();
    prisma.member.findMany.mockResolvedValue([
      { id: 'member-1', gymId: 'gym-1' },
    ]);
    prisma.userGym.findMany.mockResolvedValue([{ gymId: 'gym-1' }]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext(
          {
            sub: 'user-1',
            role: UserRole.RECEPTIONIST,
            organizationId: 'org-1',
          },
          { body: { memberId: 'member-1' } },
        ),
      ),
    ).resolves.toBe(true);
  });

  it('blocks limited users from referencing missing members', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.RECEPTIONIST]),
    };
    const prisma = createPrismaMock();
    prisma.member.findMany.mockResolvedValue([]);
    prisma.userGym.findMany.mockResolvedValue([{ gymId: 'gym-1' }]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext(
          {
            sub: 'user-1',
            role: UserRole.RECEPTIONIST,
            organizationId: 'org-1',
          },
          { body: { memberId: 'member-1' } },
        ),
      ),
    ).rejects.toThrow('Acesso ao recurso nao autorizado');
  });

  it('injects allowed gym scope for limited list requests', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const prisma = createPrismaMock();
    prisma.userGym.findMany.mockResolvedValue([
      { gymId: 'gym-1' },
      { gymId: 'gym-2' },
    ]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );
    const context = createContext({
      sub: 'user-1',
      role: UserRole.RECEPTIONIST,
      organizationId: 'org-1',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.httpRequest.query.scopeGymIds).toEqual(['gym-1', 'gym-2']);
  });

  it('blocks limited users from loading a member route from another gym', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const prisma = createPrismaMock();
    prisma.member.findMany.mockResolvedValue([
      { id: 'member-2', gymId: 'gym-2' },
    ]);
    prisma.userGym.findMany.mockResolvedValue([{ gymId: 'gym-1' }]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext(
          {
            sub: 'user-1',
            role: UserRole.RECEPTIONIST,
            organizationId: 'org-1',
          },
          { params: { id: 'member-2' } },
          'MembersController',
        ),
      ),
    ).rejects.toThrow('Acesso ao recurso nao autorizado');
  });

  it('allows limited users to load a gym route they are linked to', async () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    };
    const prisma = createPrismaMock();
    prisma.userGym.findMany.mockResolvedValue([{ gymId: 'gym-1' }]);
    const guard = new RolesGuard(
      reflector as unknown as Reflector,
      prisma as any,
    );

    await expect(
      guard.canActivate(
        createContext(
          {
            sub: 'user-1',
            role: UserRole.RECEPTIONIST,
            organizationId: 'org-1',
          },
          { params: { id: 'gym-1' } },
          'GymsController',
        ),
      ),
    ).resolves.toBe(true);
  });
});
