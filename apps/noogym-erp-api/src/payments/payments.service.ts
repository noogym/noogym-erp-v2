import { Injectable, NotFoundException } from '@nestjs/common';
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
              { reference: { contains: query.search, mode: 'insensitive' } },
              {
                member: {
                  name: { contains: query.search, mode: 'insensitive' },
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
        include: { member: true, subscription: { include: { plan: true } } },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  create(organizationId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        ...dto,
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
}
