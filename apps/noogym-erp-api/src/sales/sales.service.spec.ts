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
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
      stockMovement: {
        create: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        updateMany: jest.fn(),
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
    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'product-1' },
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
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        paidAt: soldAt,
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
