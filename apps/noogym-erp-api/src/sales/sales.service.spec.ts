import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  SaleType,
  StockMovementType,
} from '@prisma/client';
import { SalesService } from './sales.service';

describe('SalesService', () => {
  const organizationId = 'org-1';
  const sellerId = 'seller-1';

  function createService() {
    const tx = {
      sale: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stockMovement: {
        create: jest.fn(),
      },
      saleItem: {
        deleteMany: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
      },
      cashSession: {
        findFirst: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      classEnrollment: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      gymClass: {
        update: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn((callback: (transaction: any) => unknown) =>
        callback(tx),
      ),
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: sellerId }),
      },
      gym: {
        findFirst: jest.fn(),
      },
      member: {
        findFirst: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
      },
      plan: {
        findMany: jest.fn(),
      },
      gymClass: {
        findMany: jest.fn(),
      },
      sale: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    return {
      prisma,
      tx,
      service: new SalesService(prisma as any),
    };
  }

  it('creates completed sale, decrements stock and creates paid payment', async () => {
    const { prisma, tx, service } = createService();
    const soldAt = new Date('2026-06-28T10:00:00.000Z');
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Whey',
        sku: 'WHEY',
        price: 1500,
        cost: 900,
        stock: 5,
        trackStock: true,
      },
    ]);
    tx.sale.create.mockResolvedValue({
      id: 'sale-1',
      status: SaleStatus.COMPLETED,
    });
    tx.sale.findUnique.mockResolvedValue({ id: 'sale-1' });

    await service.create(organizationId, sellerId, {
      paymentMethod: PaymentMethod.CASH,
      type: SaleType.NORMAL,
      soldAt,
      items: [{ productId: 'product-1', quantity: 2, unitPrice: 1 }],
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: { organizationId, id: { in: ['product-1'] } },
    });
    expect(tx.sale.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        sellerId,
        subtotal: 3000,
        total: 3000,
        items: {
          create: [
            expect.objectContaining({
              productId: 'product-1',
              productName: 'Whey',
              quantity: 2,
              unitPrice: 1500,
              total: 3000,
            }),
          ],
        },
      }),
      include: expect.any(Object),
    });
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'product-1',
        organizationId,
        stock: { gte: 2 },
      },
      data: { stock: { decrement: 2 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        productId: 'product-1',
        type: StockMovementType.SALE,
        quantity: 2,
        reference: 'sale-1',
      }),
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        saleId: 'sale-1',
        amount: 3000,
        grossAmount: 3000,
        discountAmount: 0,
        lateFeeAmount: 0,
        outstandingAmount: 0,
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        paidAt: soldAt,
        receiptNumber: 'REC-2026-000001',
      }),
    });
  });

  it('rejects products outside the authenticated tenant', async () => {
    const { prisma, service } = createService();
    prisma.product.findMany.mockResolvedValue([]);

    await expect(
      service.create(organizationId, sellerId, {
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 'other-tenant-product', quantity: 1 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects seller outside the authenticated tenant', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(
      service.create(organizationId, sellerId, {
        paymentMethod: PaymentMethod.CASH,
        items: [{ productName: 'Avulso', quantity: 1, unitPrice: 1000 }],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects sales with insufficient stock', async () => {
    const { prisma, service } = createService();
    prisma.product.findMany.mockResolvedValue([
      {
        id: 'product-1',
        name: 'Whey',
        price: 1500,
        stock: 1,
        trackStock: true,
      },
    ]);

    await expect(
      service.create(organizationId, sellerId, {
        paymentMethod: PaymentMethod.CASH,
        items: [{ productId: 'product-1', quantity: 2 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates subscription when a completed sale includes a plan', async () => {
    const { prisma, tx, service } = createService();
    const soldAt = new Date('2026-07-15T10:00:00.000Z');
    prisma.member.findFirst.mockResolvedValue({ id: 'member-1', status: 'ACTIVE' });
    prisma.plan.findMany.mockResolvedValue([
      {
        id: 'plan-1',
        name: 'Mensal',
        price: 12000,
        durationDays: 30,
      },
    ]);
    tx.sale.create.mockResolvedValue({
      id: 'sale-1',
      status: SaleStatus.COMPLETED,
    });
    tx.sale.findUnique.mockResolvedValue({ id: 'sale-1' });
    tx.subscription.findFirst.mockResolvedValue(null);
    tx.subscription.create.mockResolvedValue({ id: 'subscription-1' });

    await service.create(organizationId, sellerId, {
      memberId: 'member-1',
      paymentMethod: PaymentMethod.MULTICAIXA,
      soldAt,
      items: [{ planId: 'plan-1', kind: 'plan', quantity: 1 }],
    });

    expect(tx.subscription.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        memberId: 'member-1',
        planId: 'plan-1',
        status: 'ACTIVE',
        startDate: soldAt,
      }),
      select: { id: true },
    });
    expect(tx.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        memberId: 'member-1',
        saleId: 'sale-1',
        subscriptionId: 'subscription-1',
        amount: 12000,
        method: PaymentMethod.MULTICAIXA,
      }),
    });
  });

  it('rejects completed sale when provided cash session is not open', async () => {
    const { tx, service } = createService();
    tx.cashSession.findFirst.mockResolvedValue(null);

    await expect(
      service.create(organizationId, sellerId, {
        cashSessionId: 'cash-session-1',
        paymentMethod: PaymentMethod.CASH,
        items: [{ productName: 'Avulso', quantity: 1, unitPrice: 1000 }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.sale.create).not.toHaveBeenCalled();
  });

  it('updates draft sale without touching stock or creating paid payment', async () => {
    const { prisma, tx, service } = createService();
    const soldAt = new Date('2026-07-15T12:00:00.000Z');
    prisma.sale.findFirst.mockResolvedValue({
      id: 'sale-1',
      status: SaleStatus.DRAFT,
    });
    tx.sale.findUnique.mockResolvedValue({ id: 'sale-1' });

    await service.update(organizationId, sellerId, 'sale-1', {
      paymentMethod: PaymentMethod.CASH,
      type: SaleType.QUOTE,
      soldAt,
      items: [{ productName: 'Personal trainer', quantity: 2, unitPrice: 12000 }],
    });

    expect(tx.saleItem.deleteMany).toHaveBeenCalledWith({
      where: { saleId: 'sale-1' },
    });
    expect(tx.payment.deleteMany).toHaveBeenCalledWith({
      where: { saleId: 'sale-1', organizationId },
    });
    expect(tx.sale.update).toHaveBeenCalledWith({
      where: { id: 'sale-1' },
      data: expect.objectContaining({
        status: SaleStatus.DRAFT,
        subtotal: 24000,
        total: 24000,
        soldAt,
      }),
    });
    expect(tx.product.updateMany).not.toHaveBeenCalled();
    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('cancels sale, restores stock and cancels related payments', async () => {
    const { prisma, tx, service } = createService();
    prisma.sale.findFirst.mockResolvedValue({
      id: 'sale-1',
      status: SaleStatus.COMPLETED,
      items: [
        {
          productId: 'product-1',
          quantity: 2,
          product: { trackStock: true },
        },
      ],
      payments: [{ id: 'payment-1' }],
    });
    tx.sale.update.mockResolvedValue({ id: 'sale-1' });

    await service.cancel(organizationId, 'sale-1');

    expect(prisma.sale.findFirst).toHaveBeenCalledWith({
      where: { id: 'sale-1', organizationId },
      include: { items: { include: { product: true } }, payments: true },
    });
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
      data: { stock: { increment: 2 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId,
        productId: 'product-1',
        type: StockMovementType.RETURN,
        quantity: 2,
        reference: 'sale-1',
      }),
    });
    expect(tx.payment.updateMany).toHaveBeenCalledWith({
      where: { saleId: 'sale-1', organizationId },
      data: { status: PaymentStatus.CANCELLED },
    });
  });
});
