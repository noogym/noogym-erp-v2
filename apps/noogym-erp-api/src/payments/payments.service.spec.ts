import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const organizationId = 'org-1';

  function createService() {
    const prisma = {
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
      },
      sale: {
        findFirst: jest.fn(),
      },
    };

    return {
      prisma,
      service: new PaymentsService(prisma as any),
    };
  }

  it('sets paidAt automatically when creating a paid payment', async () => {
    const { prisma, service } = createService();
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.create(organizationId, {
      amount: 1000,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        status: PaymentStatus.PAID,
        paidAt: expect.any(Date),
      }),
    });
  });

  it('uses subscription tenant data instead of trusting payment amount', async () => {
    const { prisma, service } = createService();
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'subscription-1',
      memberId: 'member-1',
      plan: { price: 3500 },
    });
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });

    await service.create(organizationId, {
      subscriptionId: 'subscription-1',
      amount: 1,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
    });

    expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
      where: { id: 'subscription-1', organizationId },
      select: {
        id: true,
        memberId: true,
        plan: { select: { price: true } },
      },
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        subscriptionId: 'subscription-1',
        memberId: 'member-1',
        amount: 3500,
      }),
    });
  });

  it('throws when payment member does not belong to tenant', async () => {
    const { prisma, service } = createService();
    prisma.member.findFirst.mockResolvedValue(null);

    await expect(
      service.create(organizationId, {
        memberId: 'member-from-other-tenant',
        amount: 1000,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents duplicate payments for a sale', async () => {
    const { prisma, service } = createService();
    prisma.sale.findFirst.mockResolvedValue({
      id: 'sale-1',
      memberId: null,
      total: 2500,
    });
    prisma.payment.findFirst.mockResolvedValue({ id: 'payment-1' });

    await expect(
      service.create(organizationId, {
        saleId: 'sale-1',
        amount: 2500,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('marks an existing payment as paid', async () => {
    const { prisma, service } = createService();
    prisma.payment.findFirst.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.update.mockResolvedValue({ id: 'payment-1' });

    await service.markPaid(organizationId, 'payment-1');

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment-1' },
      data: { status: 'PAID', paidAt: expect.any(Date) },
    });
  });

  it('throws when marking a payment from another tenant as paid', async () => {
    const { prisma, service } = createService();
    prisma.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.markPaid(organizationId, 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
