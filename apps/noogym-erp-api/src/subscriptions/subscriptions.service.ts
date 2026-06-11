import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.SubscriptionWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as SubscriptionStatus } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? { member: { name: { contains: query.search } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { member: true, plan: true, payments: true },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreateSubscriptionDto) {
    const [member, plan, activeSubscription] = await Promise.all([
      this.prisma.member.findFirst({
        where: { id: dto.memberId, organizationId },
      }),
      this.prisma.plan.findFirst({ where: { id: dto.planId, organizationId } }),
      this.prisma.subscription.findFirst({
        where: {
          memberId: dto.memberId,
          organizationId,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: new Date() },
        },
      }),
    ]);

    if (!member) throw new NotFoundException('Member not found');
    assertActiveMember(member);
    if (!plan) throw new NotFoundException('Plan not found');
    if (activeSubscription) {
      throw new BadRequestException(
        'Member already has an active subscription',
      );
    }

    const startDate = dto.startDate ?? new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    return this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          organizationId,
          memberId: dto.memberId,
          planId: dto.planId,
          startDate,
          endDate,
          autoRenew: dto.autoRenew ?? false,
        },
      });

      if (Number(plan.price) > 0) {
        await tx.payment.create({
          data: {
            organizationId,
            memberId: dto.memberId,
            subscriptionId: subscription.id,
            amount: plan.price,
            method: 'CASH',
            status: 'PENDING',
            dueDate: startDate,
          },
        });
      }

      return tx.subscription.findUnique({
        where: { id: subscription.id },
        include: { member: true, plan: true, payments: true },
      });
    });
  }

  async cancel(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async pause(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.subscription.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.subscription.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Subscription not found');
  }
}
