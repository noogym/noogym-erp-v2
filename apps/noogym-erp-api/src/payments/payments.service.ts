import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.PaymentWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as PaymentStatus } : {}),
      ...(query.method ? { method: query.method as PaymentMethod } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { reference: { contains: query.search } },
              {
                member: {
                  name: { contains: query.search },
                },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          member: true,
          subscription: { include: { plan: true } },
          sale: { include: { items: true } },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreatePaymentDto) {
    const relationData = await this.resolveRelationData(organizationId, dto);
    const amount = relationData.amount ?? dto.amount;

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be positive');
    }

    return this.prisma.payment.create({
      data: {
        ...dto,
        ...relationData,
        amount,
        organizationId,
        paidAt: dto.status === 'PAID' ? new Date() : undefined,
      },
    });
  }

  async markPaid(organizationId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.prisma.payment.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  private async resolveRelationData(
    organizationId: string,
    dto: CreatePaymentDto,
  ) {
    let memberId = dto.memberId;
    let amount: number | undefined;

    if (dto.memberId) {
      const member = await this.prisma.member.findFirst({
        where: { id: dto.memberId, organizationId },
        select: { id: true },
      });
      if (!member) throw new NotFoundException('Member not found');
    }

    if (dto.subscriptionId) {
      const subscription = await this.prisma.subscription.findFirst({
        where: { id: dto.subscriptionId, organizationId },
        select: {
          id: true,
          memberId: true,
          plan: { select: { price: true } },
        },
      });
      if (!subscription) throw new NotFoundException('Subscription not found');
      if (memberId && memberId !== subscription.memberId) {
        throw new BadRequestException(
          'Payment member does not match subscription member',
        );
      }

      memberId = subscription.memberId;
      amount = Number(subscription.plan.price);
    }

    if (dto.saleId) {
      const sale = await this.prisma.sale.findFirst({
        where: { id: dto.saleId, organizationId },
        select: {
          id: true,
          memberId: true,
          total: true,
        },
      });
      if (!sale) throw new NotFoundException('Sale not found');
      if (memberId && sale.memberId && memberId !== sale.memberId) {
        throw new BadRequestException('Payment member does not match sale');
      }

      const existingPayment = await this.prisma.payment.findFirst({
        where: { organizationId, saleId: dto.saleId },
        select: { id: true },
      });
      if (existingPayment) {
        throw new BadRequestException('Sale already has a payment');
      }

      memberId = memberId ?? sale.memberId ?? undefined;
      amount = Number(sale.total);
    }

    return {
      memberId,
      amount,
    };
  }
}
