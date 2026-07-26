import { DesktopSyncService } from './desktop-sync.service';

describe('DesktopSyncService', () => {
  function createService() {
    const prisma = {
      $transaction: jest.fn(async (operations: unknown[]) => operations),
      organization: {
        findUnique: jest.fn((args) => ({ model: 'organization', args })),
      },
      gym: {
        findMany: jest.fn((args) => ({ model: 'gyms', args })),
      },
      user: {
        findMany: jest.fn((args) => ({ model: 'users', args })),
      },
      member: {
        findMany: jest.fn((args) => ({ model: 'members', args })),
      },
      plan: {
        findMany: jest.fn((args) => ({ model: 'plans', args })),
      },
      subscription: {
        findMany: jest.fn((args) => ({ model: 'subscriptions', args })),
      },
      payment: {
        findMany: jest.fn((args) => ({ model: 'payments', args })),
      },
      product: {
        findMany: jest.fn((args) => ({ model: 'products', args })),
      },
      sale: {
        findMany: jest.fn((args) => ({ model: 'sales', args })),
      },
      employee: {
        findMany: jest.fn((args) => ({ model: 'employees', args })),
      },
      gymClass: {
        findMany: jest.fn((args) => ({ model: 'classes', args })),
      },
      checkIn: {
        findMany: jest.fn((args) => ({ model: 'checkIns', args })),
      },
      workout: {
        findMany: jest.fn((args) => ({ model: 'workouts', args })),
      },
    };

    return {
      prisma,
      service: new DesktopSyncService(prisma as any),
    };
  }

  it('scopes gym-aware bootstrap collections by active gym', async () => {
    const { prisma, service } = createService();

    await service.bootstrap('org-1', { gymId: 'gym-1', limit: 50 });

    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', gymId: 'gym-1' }),
      }),
    );
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', gymId: 'gym-1' }),
      }),
    );
    expect(prisma.sale.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', gymId: 'gym-1' }),
      }),
    );
    expect(prisma.gymClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', gymId: 'gym-1' }),
      }),
    );
    expect(prisma.checkIn.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', gymId: 'gym-1' }),
      }),
    );
  });

  it('keeps organization-wide bootstrap when active gym is not provided', async () => {
    const { prisma, service } = createService();

    await service.bootstrap('org-1', { limit: 50 });

    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1' },
      }),
    );
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { organizationId: 'org-1' },
      }),
    );
  });
});
