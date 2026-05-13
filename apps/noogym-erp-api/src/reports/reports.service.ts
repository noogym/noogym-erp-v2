import { Injectable } from '@nestjs/common';
import {
  MemberStatus,
  PaymentStatus,
  SubscriptionStatus,
  WorkoutStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(organizationId: string) {
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
    ] = await this.prisma.$transaction([
      this.prisma.member.count({ where: { organizationId } }),
      this.prisma.member.count({
        where: { organizationId, status: MemberStatus.ACTIVE },
      }),
      this.prisma.member.count({
        where: { organizationId, status: MemberStatus.OVERDUE },
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
      this.prisma.checkIn.count({
        where: { organizationId, checkedAt: { gte: weekStart, lt: tomorrow } },
      }),
      this.prisma.workout.count({
        where: { organizationId, status: WorkoutStatus.ACTIVE },
      }),
      this.prisma.subscription.count({
        where: {
          organizationId,
          status: SubscriptionStatus.ACTIVE,
          endDate: { gte: new Date() },
        },
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
    };
  }

  async financial(organizationId: string) {
    const [paidPayments, pendingPayments, paidExpenses, pendingExpenses] =
      await this.prisma.$transaction([
        this.prisma.payment.aggregate({
          where: { organizationId, status: PaymentStatus.PAID },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.aggregate({
          where: { organizationId, status: PaymentStatus.PENDING },
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

  async members(organizationId: string) {
    const [total, active, inactive, overdue, blocked, cancelled, recent] =
      await this.prisma.$transaction([
        this.prisma.member.count({ where: { organizationId } }),
        this.prisma.member.count({
          where: { organizationId, status: MemberStatus.ACTIVE },
        }),
        this.prisma.member.count({
          where: { organizationId, status: MemberStatus.INACTIVE },
        }),
        this.prisma.member.count({
          where: { organizationId, status: MemberStatus.OVERDUE },
        }),
        this.prisma.member.count({
          where: { organizationId, status: MemberStatus.BLOCKED },
        }),
        this.prisma.member.count({
          where: { organizationId, status: MemberStatus.CANCELLED },
        }),
        this.prisma.member.findMany({
          where: { organizationId },
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

  async workouts(organizationId: string) {
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
          where: { workout: { organizationId }, isActive: true },
        }),
      ]);

    return {
      total,
      activeAssignments: assignments,
      byStatus: { active, draft, paused, archived },
    };
  }

  async checkins(organizationId: string) {
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
        where: { organizationId, checkedAt: { gte: todayStart, lt: tomorrow } },
      }),
      this.prisma.checkIn.count({
        where: { organizationId, checkedAt: { gte: weekStart, lt: tomorrow } },
      }),
      this.prisma.checkIn.count({
        where: { organizationId, checkedAt: { gte: monthStart, lt: tomorrow } },
      }),
      this.prisma.checkIn.findMany({
        where: { organizationId },
        orderBy: { checkedAt: 'desc' },
        take: 10,
        include: { member: true, gym: true },
      }),
    ]);

    return { today, week, month, recent };
  }

  async sales(organizationId: string) {
    const [subscriptions, payments, topPlans] = await this.prisma.$transaction([
      this.prisma.subscription.count({ where: { organizationId } }),
      this.prisma.payment.aggregate({
        where: { organizationId, status: PaymentStatus.PAID },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.plan.findMany({
        where: { organizationId },
        include: { _count: { select: { subscriptions: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      subscriptionsTotal: subscriptions,
      salesCount: payments._count.id,
      salesTotal: Number(payments._sum.amount ?? 0),
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
}
