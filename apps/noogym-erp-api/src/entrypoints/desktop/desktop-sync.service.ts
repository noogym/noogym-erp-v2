import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DesktopSyncQueryDto } from './dto/desktop-sync-query.dto';

@Injectable()
export class DesktopSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(organizationId: string, query: DesktopSyncQueryDto) {
    const updatedAtFilter = this.updatedAtFilter(query.since);
    const createdAtFilter = this.createdAtFilter(query.since);
    const gymFilter = this.gymFilter(query.gymId);
    const planFilter = this.planFilter(query.gymId);
    const subscriptionFilter = this.subscriptionFilter(query.gymId);
    const paymentFilter = this.paymentFilter(query.gymId);
    const take = query.limit;

    const [
      organization,
      gyms,
      users,
      members,
      plans,
      subscriptions,
      payments,
      products,
      sales,
      employees,
      classes,
      checkIns,
      workouts,
    ] = await this.prisma.$transaction([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
      }),
      this.prisma.gym.findMany({
        where: { organizationId, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: { organizationId, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          organizationId: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          gyms: true,
        },
      }),
      this.prisma.member.findMany({
        where: { organizationId, ...gymFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        include: { gym: true },
      }),
      this.prisma.plan.findMany({
        where: { organizationId, ...planFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.subscription.findMany({
        where: { organizationId, ...subscriptionFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        include: { member: true, plan: true },
      }),
      this.prisma.payment.findMany({
        where: { organizationId, ...paymentFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.findMany({
        where: { organizationId, ...gymFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.sale.findMany({
        where: { organizationId, ...gymFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        include: { items: true, payments: true },
      }),
      this.prisma.employee.findMany({
        where: { organizationId, ...gymFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.gymClass.findMany({
        where: { organizationId, ...gymFilter, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        include: { enrollments: true },
      }),
      this.prisma.checkIn.findMany({
        where: { organizationId, ...gymFilter, ...createdAtFilter },
        take,
        orderBy: { checkedAt: 'desc' },
      }),
      this.prisma.workout.findMany({
        where: { organizationId, ...updatedAtFilter },
        take,
        orderBy: { updatedAt: 'desc' },
        include: { exercises: true, assignments: true },
      }),
    ]);

    return {
      generatedAt: new Date(),
      since: query.since ?? null,
      schemaVersion: 1,
      limit: take,
      organization,
      data: {
        gyms,
        users,
        members,
        plans,
        subscriptions,
        payments,
        products,
        sales,
        employees,
        classes,
        checkIns,
        workouts,
      },
    };
  }

  private updatedAtFilter(since?: string): Prisma.DateTimeFilter | object {
    return since ? { updatedAt: { gte: new Date(since) } } : {};
  }

  private createdAtFilter(since?: string): object {
    return since ? { checkedAt: { gte: new Date(since) } } : {};
  }

  private gymFilter(gymId?: string): object {
    return gymId ? { gymId } : {};
  }

  private planFilter(gymId?: string): object {
    if (!gymId) return {};
    return {
      OR: [{ gyms: { some: { gymId } } }, { gyms: { none: {} } }],
    };
  }

  private subscriptionFilter(gymId?: string): object {
    return gymId ? { member: { gymId } } : {};
  }

  private paymentFilter(gymId?: string): object {
    if (!gymId) return {};
    return {
      OR: [{ member: { gymId } }, { sale: { gymId } }],
    };
  }
}
