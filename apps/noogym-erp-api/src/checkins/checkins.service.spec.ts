import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CheckInMethod, MemberStatus } from '@prisma/client';
import { CheckinsService } from './checkins.service';

describe('CheckinsService', () => {
  const organizationId = 'org-1';
  const dto = {
    memberId: 'member-1',
    method: CheckInMethod.MANUAL,
  };

  function createService() {
    const prisma = {
      member: {
        findFirst: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
      gym: {
        findFirst: jest.fn(),
      },
      checkIn: {
        create: jest.fn(),
      },
    };

    return {
      prisma,
      service: new CheckinsService(prisma as any),
    };
  }

  it('creates check-in for an active member with a valid subscription', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
      gymId: 'gym-1',
    });
    prisma.subscription.findFirst.mockResolvedValue({ id: 'subscription-1' });
    prisma.checkIn.create.mockResolvedValue({ id: 'checkin-1' });

    await service.create(organizationId, dto);

    expect(prisma.checkIn.create).toHaveBeenCalledWith({
      data: {
        organizationId,
        memberId: 'member-1',
        gymId: 'gym-1',
        method: CheckInMethod.MANUAL,
        notes: undefined,
      },
      include: { member: true, gym: true },
    });
  });

  it('throws when member does not exist in tenant', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when member is not active', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.BLOCKED,
    });

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when member has no valid active subscription', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when explicit gym does not belong to tenant', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
      gymId: 'gym-1',
    });
    prisma.subscription.findFirst.mockResolvedValue({ id: 'subscription-1' });
    prisma.gym.findFirst.mockResolvedValue(null);

    await expect(
      service.create(organizationId, { ...dto, gymId: 'other-gym' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
