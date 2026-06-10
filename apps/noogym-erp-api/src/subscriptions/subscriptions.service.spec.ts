import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MemberStatus, SubscriptionStatus } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService', () => {
  const organizationId = 'org-1';
  const dto = {
    memberId: 'member-1',
    planId: 'plan-1',
    startDate: new Date('2026-04-01T00:00:00.000Z'),
  };

  function createService() {
    const tx = {
      subscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      payment: {
        create: jest.fn(),
      },
    };
    const prisma = {
      member: {
        findFirst: jest.fn(),
      },
      plan: {
        findFirst: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(tx)),
    };

    return {
      prisma,
      tx,
      service: new SubscriptionsService(prisma as any),
    };
  }

  it('creates a subscription and pending payment for paid plans', async () => {
    const { prisma, tx, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });
    prisma.plan.findFirst.mockResolvedValue({
      id: 'plan-1',
      durationDays: 30,
      price: 15000,
    });
    prisma.subscription.findFirst.mockResolvedValue(null);
    tx.subscription.create.mockResolvedValue({ id: 'subscription-1' });
    tx.subscription.findUnique.mockResolvedValue({ id: 'subscription-1' });

    await service.create(organizationId, dto);

    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: {
        organizationId,
        memberId: 'member-1',
        planId: 'plan-1',
        startDate: dto.startDate,
        endDate: new Date('2026-05-01T00:00:00.000Z'),
        autoRenew: false,
      },
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: {
        organizationId,
        memberId: 'member-1',
        subscriptionId: 'subscription-1',
        amount: 15000,
        method: 'CASH',
        status: 'PENDING',
        dueDate: dto.startDate,
      },
    });
  });

  it('does not create payment for free plans', async () => {
    const { prisma, tx, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });
    prisma.plan.findFirst.mockResolvedValue({
      id: 'plan-1',
      durationDays: 30,
      price: 0,
    });
    prisma.subscription.findFirst.mockResolvedValue(null);
    tx.subscription.create.mockResolvedValue({ id: 'subscription-1' });
    tx.subscription.findUnique.mockResolvedValue({ id: 'subscription-1' });

    await service.create(organizationId, dto);

    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('throws when member does not exist', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue(null);
    prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when plan does not exist', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });
    prisma.plan.findFirst.mockResolvedValue(null);
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when member is not active', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.INACTIVE,
    });
    prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
    prisma.subscription.findFirst.mockResolvedValue(null);

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('prevents more than one active valid subscription per member', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue({
      id: 'member-1',
      status: MemberStatus.ACTIVE,
    });
    prisma.plan.findFirst.mockResolvedValue({ id: 'plan-1' });
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'subscription-active',
      status: SubscriptionStatus.ACTIVE,
    });

    await expect(service.create(organizationId, dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
