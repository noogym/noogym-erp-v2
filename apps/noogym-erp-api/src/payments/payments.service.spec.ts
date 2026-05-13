import { NotFoundException } from '@nestjs/common';
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
