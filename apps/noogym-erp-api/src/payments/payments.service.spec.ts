import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const organizationId = 'org-1';

  function createService() {
    const prisma = {
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      sale: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prisma)),
    };

    return {
      prisma,
      service: new PaymentsService(prisma as any),
    };
  }

  it('sets paidAt automatically when creating a paid payment', async () => {
    const { prisma, service } = createService();
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });

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

  it('uses subscription tenant data as gross amount without overriding paid amount', async () => {
    const { prisma, service } = createService();
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'subscription-1',
      memberId: 'member-1',
      plan: { price: 3500, durationDays: 30 },
    });
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });

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
        plan: { select: { price: true, durationDays: true } },
      },
    });
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        subscriptionId: 'subscription-1',
        memberId: 'member-1',
        amount: 1,
        grossAmount: 3500,
        outstandingAmount: 3499,
      }),
    });
  });

  it('renews latest member subscription when a paid monthly payment is fully settled', async () => {
    const { prisma, service } = createService();
    const paidAt = new Date('2026-07-16T10:00:00.000Z');
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1' });
    prisma.subscription.findFirst
      .mockResolvedValueOnce({
        id: 'subscription-1',
        memberId: 'member-1',
        plan: { price: 5000, durationDays: 30 },
      })
      .mockResolvedValueOnce({
        id: 'subscription-1',
        endDate: new Date('2026-07-08T00:00:00.000Z'),
      });
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });
    await service.create(organizationId, {
      memberId: 'member-1',
      amount: 5100,
      grossAmount: 5000,
      lateFeeAmount: 100,
      outstandingAmount: 0,
      paidAt,
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        memberId: 'member-1',
        subscriptionId: 'subscription-1',
        amount: 5100,
        outstandingAmount: 0,
        paidAt,
      }),
    });
    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'subscription-1' },
      data: expect.objectContaining({
        status: 'ACTIVE',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        nextBillingDate: expect.any(Date),
      }),
    });
    expect(prisma.member.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'member-1',
        organizationId,
        status: { in: ['OVERDUE', 'INACTIVE'] },
      },
      data: { status: 'ACTIVE' },
    });
  });

  it('persists discount, late fee, outstanding balance and receipt number', async () => {
    const { prisma, service } = createService();
    prisma.payment.create.mockResolvedValue({ id: 'payment-1' });
    prisma.payment.findUnique.mockResolvedValue({ id: 'payment-1' });

    await service.create(organizationId, {
      memberId: undefined,
      amount: 8000,
      grossAmount: 10000,
      discountAmount: 1500,
      lateFeeAmount: 500,
      outstandingAmount: 1000,
      receiptNumber: 'NG-001',
      method: PaymentMethod.CASH,
      status: PaymentStatus.PAID,
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 8000,
        grossAmount: 10000,
        discountAmount: 1500,
        lateFeeAmount: 500,
        outstandingAmount: 1000,
        receiptNumber: 'NG-001',
      }),
    });
  });

  it('rejects discounts greater than gross amount', async () => {
    const { service } = createService();

    await expect(
      service.create(organizationId, {
        amount: 1000,
        grossAmount: 1000,
        discountAmount: 1001,
        method: PaymentMethod.CASH,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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
