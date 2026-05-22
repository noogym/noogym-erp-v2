import { Injectable } from '@nestjs/common';
import {
  GymClassStatus,
  MemberStatus,
  PaymentStatus,
  ProductStatus,
  SaleStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WebAdminEntrypointService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(organizationId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      organization,
      totalMembers,
      activeMembers,
      activeSubscriptions,
      paidPayments,
      paidExpenses,
      checkinsToday,
      completedSales,
      activeProducts,
      lowStockProducts,
      upcomingClasses,
      recentSales,
      recentMembers,
    ] = await this.prisma.$transaction([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: { gyms: true },
      }),
      this.prisma.member.count({ where: { organizationId } }),
      this.prisma.member.count({
        where: { organizationId, status: MemberStatus.ACTIVE },
      }),
      this.prisma.subscription.count({
        where: {
          organizationId,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: new Date() },
        },
      }),
      this.prisma.payment.aggregate({
        where: { organizationId, status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { organizationId, status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.checkIn.count({
        where: { organizationId, checkedAt: { gte: todayStart, lt: tomorrow } },
      }),
      this.prisma.sale.aggregate({
        where: { organizationId, status: SaleStatus.COMPLETED },
        _sum: { total: true },
        _count: { id: true },
      }),
      this.prisma.product.count({
        where: { organizationId, status: ProductStatus.ACTIVE },
      }),
      this.prisma.product.findMany({
        where: {
          organizationId,
          status: ProductStatus.ACTIVE,
          trackStock: true,
        },
        orderBy: { stock: 'asc' },
        take: 8,
      }),
      this.prisma.gymClass.findMany({
        where: {
          organizationId,
          status: {
            in: [GymClassStatus.SCHEDULED, GymClassStatus.IN_PROGRESS],
          },
        },
        orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        include: { gym: true, room: true, instructor: true },
      }),
      this.prisma.sale.findMany({
        where: { organizationId },
        orderBy: { soldAt: 'desc' },
        take: 8,
        include: { member: true, seller: true, items: true },
      }),
      this.prisma.member.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { gym: true },
      }),
    ]);

    const revenueTotal = Number(paidPayments._sum.amount ?? 0);
    const expensesTotal = Number(paidExpenses._sum.amount ?? 0);

    return {
      organization,
      metrics: {
        totalMembers,
        activeMembers,
        activeSubscriptions,
        revenueTotal,
        expensesTotal,
        netProfit: revenueTotal - expensesTotal,
        checkinsToday,
        completedSales: completedSales._count.id,
        posRevenueTotal: Number(completedSales._sum.total ?? 0),
        activeProducts,
      },
      lowStockProducts: lowStockProducts.filter(
        (product) => product.stock <= product.minStock,
      ),
      upcomingClasses,
      recentSales,
      recentMembers,
    };
  }
}
