import { Injectable } from '@nestjs/common';
import {
  EmployeeStatus,
  GymClassStatus,
  MemberStatus,
  PaymentStatus,
  ProductStatus,
  SaleStatus,
  SubscriptionStatus,
  WorkoutStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  directGymScope,
  hasScope,
  memberGymScope,
  paymentGymScope,
  planGymScope,
  saleGymScope,
} from '../common/utils/gym-scope';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const memberScope = memberGymScope(query);
    const paymentScope = paymentGymScope(query);
    const saleScope = saleGymScope(query);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    const [
      totalMembers,
      activeMembers,
      overdueMembers,
      income,
      expenses,
      checkinsToday,
      weeklyCheckins,
      activeWorkouts,
      activeSubscriptions,
      completedSales,
      activeProducts,
    ] = await this.prisma.$transaction([
      this.prisma.member.count({ where: { organizationId, ...directScope } }),
      this.prisma.member.count({
        where: { organizationId, ...directScope, status: MemberStatus.ACTIVE },
      }),
      this.prisma.member.count({
        where: { organizationId, ...directScope, status: MemberStatus.OVERDUE },
      }),
      this.prisma.payment.aggregate({
        where: {
          organizationId,
          ...(hasScope(paymentScope) ? { AND: [paymentScope] } : {}),
          status: PaymentStatus.PAID,
        },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { organizationId, status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),
      this.prisma.checkIn.count({
        where: {
          organizationId,
          ...directScope,
          checkedAt: { gte: todayStart, lt: tomorrow },
        },
      }),
      this.prisma.checkIn.count({
        where: {
          organizationId,
          ...directScope,
          checkedAt: { gte: weekStart, lt: tomorrow },
        },
      }),
      this.prisma.workout.count({
        where: { organizationId, status: WorkoutStatus.ACTIVE },
      }),
      this.prisma.subscription.count({
        where: {
          organizationId,
          ...(Object.keys(memberScope).length ? { member: memberScope } : {}),
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: new Date() },
        },
      }),
      this.prisma.sale.count({
        where: {
          organizationId,
          ...(hasScope(saleScope) ? { AND: [saleScope] } : {}),
          status: SaleStatus.COMPLETED,
        },
      }),
      this.prisma.product.count({
        where: { organizationId, ...directScope, status: ProductStatus.ACTIVE },
      }),
    ]);

    const revenueTotal = Number(income._sum.amount ?? 0);
    const expensesTotal = Number(expenses._sum.amount ?? 0);

    return {
      totalMembers,
      activeMembers,
      overdueMembers,
      activeSubscriptions,
      revenueTotal,
      expensesTotal,
      netProfit: revenueTotal - expensesTotal,
      checkinsToday,
      weeklyFrequency: weeklyCheckins,
      activeWorkouts,
      completedSales,
      activeProducts,
    };
  }

  async financial(organizationId: string, query: PaginationQueryDto) {
    const paymentScope = paymentGymScope(query);
    const [paidPayments, pendingPayments, paidExpenses, pendingExpenses] =
      await this.prisma.$transaction([
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            ...(hasScope(paymentScope) ? { AND: [paymentScope] } : {}),
            status: PaymentStatus.PAID,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            ...(hasScope(paymentScope) ? { AND: [paymentScope] } : {}),
            status: PaymentStatus.PENDING,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: { organizationId, status: PaymentStatus.PAID },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.expense.aggregate({
          where: { organizationId, status: PaymentStatus.PENDING },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

    const revenueTotal = Number(paidPayments._sum.amount ?? 0);
    const expensesTotal = Number(paidExpenses._sum.amount ?? 0);

    return {
      revenueTotal,
      pendingRevenue: Number(pendingPayments._sum.amount ?? 0),
      expensesTotal,
      pendingExpenses: Number(pendingExpenses._sum.amount ?? 0),
      netProfit: revenueTotal - expensesTotal,
      paidPaymentsCount: paidPayments._count.id,
      pendingPaymentsCount: pendingPayments._count.id,
      paidExpensesCount: paidExpenses._count.id,
      pendingExpensesCount: pendingExpenses._count.id,
    };
  }

  async members(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const [total, active, inactive, overdue, blocked, cancelled, recent] =
      await this.prisma.$transaction([
        this.prisma.member.count({ where: { organizationId, ...directScope } }),
        this.prisma.member.count({
          where: {
            organizationId,
            ...directScope,
            status: MemberStatus.ACTIVE,
          },
        }),
        this.prisma.member.count({
          where: {
            organizationId,
            ...directScope,
            status: MemberStatus.INACTIVE,
          },
        }),
        this.prisma.member.count({
          where: {
            organizationId,
            ...directScope,
            status: MemberStatus.OVERDUE,
          },
        }),
        this.prisma.member.count({
          where: {
            organizationId,
            ...directScope,
            status: MemberStatus.BLOCKED,
          },
        }),
        this.prisma.member.count({
          where: {
            organizationId,
            ...directScope,
            status: MemberStatus.CANCELLED,
          },
        }),
        this.prisma.member.findMany({
          where: { organizationId, ...directScope },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

    return {
      total,
      byStatus: { active, inactive, overdue, blocked, cancelled },
      recent,
    };
  }

  async workouts(organizationId: string, query: PaginationQueryDto) {
    const memberScope = memberGymScope(query);
    const [total, active, draft, paused, archived, assignments] =
      await this.prisma.$transaction([
        this.prisma.workout.count({ where: { organizationId } }),
        this.prisma.workout.count({
          where: { organizationId, status: WorkoutStatus.ACTIVE },
        }),
        this.prisma.workout.count({
          where: { organizationId, status: WorkoutStatus.DRAFT },
        }),
        this.prisma.workout.count({
          where: { organizationId, status: WorkoutStatus.PAUSED },
        }),
        this.prisma.workout.count({
          where: { organizationId, status: WorkoutStatus.ARCHIVED },
        }),
        this.prisma.workoutAssignment.count({
          where: {
            workout: { organizationId },
            ...(Object.keys(memberScope).length ? { member: memberScope } : {}),
            isActive: true,
          },
        }),
      ]);

    return {
      total,
      activeAssignments: assignments,
      byStatus: { active, draft, paused, archived },
    };
  }

  async checkins(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      1,
    );

    const [today, week, month, recent] = await this.prisma.$transaction([
      this.prisma.checkIn.count({
        where: {
          organizationId,
          ...directScope,
          checkedAt: { gte: todayStart, lt: tomorrow },
        },
      }),
      this.prisma.checkIn.count({
        where: {
          organizationId,
          ...directScope,
          checkedAt: { gte: weekStart, lt: tomorrow },
        },
      }),
      this.prisma.checkIn.count({
        where: {
          organizationId,
          ...directScope,
          checkedAt: { gte: monthStart, lt: tomorrow },
        },
      }),
      this.prisma.checkIn.findMany({
        where: { organizationId, ...directScope },
        orderBy: { checkedAt: 'desc' },
        take: 10,
        include: { member: true, gym: true },
      }),
    ]);

    return { today, week, month, recent };
  }

  async sales(organizationId: string, query: PaginationQueryDto) {
    const memberScope = memberGymScope(query);
    const paymentScope = paymentGymScope(query);
    const saleScope = saleGymScope(query);
    const [subscriptions, payments, posSales, topPlans, recentSales] =
      await this.prisma.$transaction([
        this.prisma.subscription.count({
          where: {
            organizationId,
            ...(Object.keys(memberScope).length ? { member: memberScope } : {}),
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            ...(hasScope(paymentScope) ? { AND: [paymentScope] } : {}),
            status: PaymentStatus.PAID,
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.sale.aggregate({
          where: {
            organizationId,
            ...(hasScope(saleScope) ? { AND: [saleScope] } : {}),
            status: SaleStatus.COMPLETED,
          },
          _sum: { total: true },
          _count: { id: true },
        }),
        this.prisma.plan.findMany({
          where: { organizationId, ...planGymScope(query) },
          include: { _count: { select: { subscriptions: true } } },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.sale.findMany({
          where: {
            organizationId,
            ...(hasScope(saleScope) ? { AND: [saleScope] } : {}),
          },
          orderBy: { soldAt: 'desc' },
          take: 10,
          include: { member: true, seller: true, items: true },
        }),
      ]);

    return {
      subscriptionsTotal: subscriptions,
      salesCount: payments._count.id,
      salesTotal: Number(payments._sum.amount ?? 0),
      posSalesCount: posSales._count.id,
      posSalesTotal: Number(posSales._sum.total ?? 0),
      recentSales,
      plans: topPlans
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          price: Number(plan.price),
          subscriptions: plan._count.subscriptions,
        }))
        .sort((a, b) => b.subscriptions - a.subscriptions),
    };
  }

  async products(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const saleScope = saleGymScope(query);
    const [total, active, inactive, lowStock, inventory, saleItems, recent] =
      await this.prisma.$transaction([
        this.prisma.product.count({
          where: { organizationId, ...directScope },
        }),
        this.prisma.product.count({
          where: {
            organizationId,
            ...directScope,
            status: ProductStatus.ACTIVE,
          },
        }),
        this.prisma.product.count({
          where: {
            organizationId,
            ...directScope,
            status: ProductStatus.INACTIVE,
          },
        }),
        this.prisma.product.findMany({
          where: {
            organizationId,
            ...directScope,
            trackStock: true,
          },
          orderBy: { stock: 'asc' },
          take: 10,
        }),
        this.prisma.product.findMany({
          where: { organizationId, ...directScope },
          select: { stock: true, price: true, cost: true },
        }),
        this.prisma.saleItem.findMany({
          where: {
            sale: {
              organizationId,
              ...(hasScope(saleScope) ? { AND: [saleScope] } : {}),
              status: SaleStatus.COMPLETED,
            },
          },
          select: { productName: true, quantity: true, total: true },
        }),
        this.prisma.product.findMany({
          where: { organizationId, ...directScope },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

    return {
      total,
      byStatus: { active, inactive },
      lowStock: lowStock.filter((product) => product.stock <= product.minStock),
      inventoryValue: inventory.reduce(
        (sum, product) => sum + product.stock * Number(product.price),
        0,
      ),
      inventoryCost: inventory.reduce(
        (sum, product) => sum + product.stock * Number(product.cost),
        0,
      ),
      topItems: this.aggregateSaleItems(saleItems),
      recent,
    };
  }

  async classes(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const [total, scheduled, inProgress, completed, cancelled, upcoming] =
      await this.prisma.$transaction([
        this.prisma.gymClass.count({
          where: { organizationId, ...directScope },
        }),
        this.prisma.gymClass.count({
          where: {
            organizationId,
            ...directScope,
            status: GymClassStatus.SCHEDULED,
          },
        }),
        this.prisma.gymClass.count({
          where: {
            organizationId,
            ...directScope,
            status: GymClassStatus.IN_PROGRESS,
          },
        }),
        this.prisma.gymClass.count({
          where: {
            organizationId,
            ...directScope,
            status: GymClassStatus.COMPLETED,
          },
        }),
        this.prisma.gymClass.count({
          where: {
            organizationId,
            ...directScope,
            status: GymClassStatus.CANCELLED,
          },
        }),
        this.prisma.gymClass.findMany({
          where: { organizationId, ...directScope },
          orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
          take: 10,
          include: { instructor: true, room: true, gym: true },
        }),
      ]);

    return {
      total,
      byStatus: { scheduled, inProgress, completed, cancelled },
      upcoming,
    };
  }

  async employees(organizationId: string, query: PaginationQueryDto) {
    const directScope = directGymScope(query);
    const [total, active, inactive, onLeave, terminated, recent] =
      await this.prisma.$transaction([
        this.prisma.employee.count({
          where: { organizationId, ...directScope },
        }),
        this.prisma.employee.count({
          where: {
            organizationId,
            ...directScope,
            status: EmployeeStatus.ACTIVE,
          },
        }),
        this.prisma.employee.count({
          where: {
            organizationId,
            ...directScope,
            status: EmployeeStatus.INACTIVE,
          },
        }),
        this.prisma.employee.count({
          where: {
            organizationId,
            ...directScope,
            status: EmployeeStatus.ON_LEAVE,
          },
        }),
        this.prisma.employee.count({
          where: {
            organizationId,
            ...directScope,
            status: EmployeeStatus.TERMINATED,
          },
        }),
        this.prisma.employee.findMany({
          where: { organizationId, ...directScope },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            gym: true,
            user: true,
            _count: { select: { classes: true } },
          },
        }),
      ]);

    return {
      total,
      byStatus: { active, inactive, onLeave, terminated },
      recent,
    };
  }

  private aggregateSaleItems(
    items: Array<{ productName: string; quantity: number; total: unknown }>,
  ) {
    const totals = new Map<string, { quantity: number; revenue: number }>();
    for (const item of items) {
      const current = totals.get(item.productName) ?? {
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += Number(item.total ?? 0);
      totals.set(item.productName, current);
    }

    return [...totals.entries()]
      .map(([productName, data]) => ({ productName, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }
}
