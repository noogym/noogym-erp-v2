import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SuperAdminService } from './super-admin.service';

describe('SuperAdminService', () => {
  const actor = {
    sub: 'super-1',
    email: 'super@noogym.com',
    role: UserRole.SUPER_ADMIN,
    organizationId: 'platform-org',
  };

  function createService() {
    const prisma = {
      organization: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };
    const authService = {
      forgotPassword: jest.fn(),
      buildSupportAuthResponse: jest.fn(),
    };

    return {
      prisma,
      authService,
      service: new SuperAdminService(prisma as any, authService as any),
    };
  }

  it('returns platform overview with flattened user gyms and totals', async () => {
    const { prisma, service } = createService();
    prisma.organization.findMany.mockResolvedValue([
      {
        id: 'org-1',
        name: 'Gym One',
        _count: {
          gyms: 2,
          users: 3,
          members: 40,
          plans: 5,
          products: 7,
          sales: 9,
          employees: 4,
          subscriptions: 30,
          payments: 20,
          checkIns: 100,
        },
        gyms: [{ id: 'gym-1', name: 'Main' }],
        users: [
          {
            id: 'user-1',
            name: 'Owner',
            gyms: [{ gym: { id: 'gym-1', name: 'Main' } }],
          },
        ],
      },
    ]);

    const result = await service.overview();

    expect(result.totals).toMatchObject({
      organizations: 1,
      gyms: 2,
      users: 3,
      members: 40,
      plans: 5,
      products: 7,
      sales: 9,
    });
    expect(result.organizations[0].users[0].gyms).toEqual([
      { id: 'gym-1', name: 'Main' },
    ]);
  });

  it('requests a password reset for a target user', async () => {
    const { prisma, authService, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      email: 'owner@gym.com',
      name: 'Owner',
      organization: { name: 'Gym One' },
    });
    authService.forgotPassword.mockResolvedValue({
      message: 'Password reset email sent',
      resetUrl: 'https://admin.noogym.com/reset-password?token=token',
    });

    const result = await service.sendPasswordReset('user-1');

    expect(authService.forgotPassword).toHaveBeenCalledWith({
      email: 'owner@gym.com',
    });
    expect(result.user).toEqual({
      email: 'owner@gym.com',
      name: 'Owner',
      organizationName: 'Gym One',
    });
    expect(result.resetUrl).toContain('reset-password');
  });

  it('creates audited support session for an organization', async () => {
    const { prisma, authService, service } = createService();
    const targetOrganization = {
      id: 'org-1',
      name: 'Gym One',
      gyms: [{ id: 'gym-1', name: 'Main' }],
    };
    const actorUser = {
      id: 'super-1',
      email: 'super@noogym.com',
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      organizationId: 'platform-org',
    };
    prisma.organization.findUnique.mockResolvedValue(targetOrganization);
    prisma.user.findUnique.mockResolvedValue(actorUser);
    authService.buildSupportAuthResponse.mockReturnValue({
      accessToken: 'support-token',
      user: { supportMode: true },
    });

    const result = await service.createSupportSession(actor, {
      organizationId: 'org-1',
      reason: '  Cliente autorizou suporte remoto  ',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        userId: 'super-1',
        action: 'SUPPORT_SESSION_START',
        entity: 'support-sessions',
        entityId: expect.any(String),
        metadata: expect.objectContaining({
          reason: 'Cliente autorizou suporte remoto',
          actorEmail: 'super@noogym.com',
          targetOrganizationId: 'org-1',
        }),
      }),
    });
    expect(authService.buildSupportAuthResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: actorUser,
        targetOrganization,
        gyms: targetOrganization.gyms,
        reason: 'Cliente autorizou suporte remoto',
        supportSessionId: expect.any(String),
      }),
    );
    expect(result.accessToken).toBe('support-token');
  });

  it('rejects support session for missing organization', async () => {
    const { prisma, service } = createService();
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'super-1' });

    await expect(
      service.createSupportSession(actor, {
        organizationId: 'missing-org',
        reason: 'Cliente autorizou suporte remoto',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('audits support session end when active', async () => {
    const { prisma, service } = createService();

    const result = await service.endSupportSession({
      ...actor,
      organizationId: 'org-1',
      supportMode: true,
      supportSessionId: 'support-1',
      supportReason: 'Cliente autorizou suporte remoto',
      supportActorId: 'super-1',
      supportActorEmail: 'super@noogym.com',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        userId: 'super-1',
        action: 'SUPPORT_SESSION_END',
        entityId: 'support-1',
      }),
    });
    expect(result).toEqual({ message: 'Support session ended' });
  });

  it('does not audit support session end when support mode is inactive', async () => {
    const { prisma, service } = createService();

    const result = await service.endSupportSession(actor);

    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(result).toEqual({ message: 'No active support session' });
  });
});
