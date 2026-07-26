import { ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';

describe('MembersService', () => {
  const organizationId = 'org-1';

  function createService() {
    const prisma = {
      gym: {
        findFirst: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    return {
      prisma,
      service: new MembersService(prisma as any),
    };
  }

  it('creates a member when identity fields are unique', async () => {
    const { prisma, service } = createService();
    prisma.member.findMany.mockResolvedValue([]);
    prisma.member.create.mockResolvedValue({ id: 'member-1' });

    await service.create(organizationId, {
      name: 'Ana Costa',
      email: ' ANA.COSTA@EXAMPLE.COM ',
      phone: '+244 923 111 111',
      documentNumber: '000000000LA001',
    });

    expect(prisma.member.create).toHaveBeenCalledWith({
      data: {
        organizationId,
        name: 'Ana Costa',
        email: 'ana.costa@example.com',
        phone: '+244 923 111 111',
        documentNumber: '000000000LA001',
        qrToken: expect.any(String),
        qrTokenUpdatedAt: expect.any(Date),
      },
      include: {
        gym: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });
  });

  it('throws when email is already registered in the organization', async () => {
    const { prisma, service } = createService();
    prisma.member.findMany.mockResolvedValue([
      {
        id: 'member-existing',
        email: 'ana.costa@example.com',
        phone: '+244 923 111 111',
        documentNumber: '000000000LA001',
      },
    ]);

    await expect(
      service.create(organizationId, {
        name: 'Outra Ana',
        email: 'ANA.COSTA@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it('throws when phone is already registered with different formatting', async () => {
    const { prisma, service } = createService();
    prisma.member.findMany.mockResolvedValue([
      {
        id: 'member-existing',
        email: 'ana.costa@example.com',
        phone: '+244 923 111 111',
        documentNumber: null,
      },
    ]);

    await expect(
      service.create(organizationId, {
        name: 'Outra Ana',
        phone: '244923111111',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it('throws when BI is already registered with different formatting', async () => {
    const { prisma, service } = createService();
    prisma.member.findMany.mockResolvedValue([
      {
        id: 'member-existing',
        email: null,
        phone: null,
        documentNumber: '000000000LA001',
      },
    ]);

    await expect(
      service.create(organizationId, {
        name: 'Outra Ana',
        documentNumber: '000 000 000 la 001',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.member.create).not.toHaveBeenCalled();
  });

  it('ignores the current member identity when updating', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1' });
    prisma.member.findMany.mockResolvedValue([]);
    prisma.member.update.mockResolvedValue({ id: 'member-1' });

    await service.update(organizationId, 'member-1', {
      phone: '+244 923 111 111',
    });

    expect(prisma.member.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: 'member-1' },
        }),
      }),
    );
    expect(prisma.member.update).toHaveBeenCalled();
  });
});
