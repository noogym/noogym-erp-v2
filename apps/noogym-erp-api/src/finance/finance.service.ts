import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashSessionStatus,
  MemberStatus,
  PaymentMethod,
  PaymentStatus,
  SaleStatus,
  SubscriptionStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  directGymScope,
  hasScope,
  paymentGymScope,
  saleGymScope,
} from '../common/utils/gym-scope';
import { PrismaService } from '../prisma/prisma.service';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateFinanceAccountDto } from './dto/create-finance-account.dto';
import { CreateFinanceCategoryDto } from './dto/create-finance-category.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { UpdateFinanceAccountDto } from './dto/update-finance-account.dto';
import { UpdateFinanceCategoryDto } from './dto/update-finance-category.dto';

const palette = {
  lime: '#B6FF00',
  red: '#FF2D20',
  yellow: '#FACC15',
  orange: '#F59E0B',
  blue: '#38BDF8',
  purple: '#A78BFA',
  cyan: '#2DD4BF',
  gray: '#94A3B8',
};

const colors = [
  palette.lime,
  palette.orange,
  palette.blue,
  palette.purple,
  palette.cyan,
  palette.yellow,
  palette.gray,
];

const weekdays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string, query: PaginationQueryDto) {
    await this.ensureDefaults(organizationId);
    const dateRange = this.dateRange(query);
    const paymentScope = paymentGymScope(query);
    const saleScope = saleGymScope(query);
    const methodFilter = query.method
      ? { method: query.method as PaymentMethod }
      : {};
    const now = new Date();

    const [payments, expenses, sales, members, accounts] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where: {
            organizationId,
            ...(hasScope(paymentScope) ? { AND: [paymentScope] } : {}),
            ...methodFilter,
            ...(dateRange ? { createdAt: dateRange } : {}),
          },
          orderBy: { createdAt: 'desc' },
          include: {
            member: true,
            subscription: { include: { plan: true } },
            sale: { include: { items: true } },
          },
        }),
        this.prisma.expense.findMany({
          where: {
            organizationId,
            ...methodFilter,
            ...(dateRange ? { createdAt: dateRange } : {}),
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.sale.findMany({
          where: {
            organizationId,
            ...(hasScope(saleScope) ? { AND: [saleScope] } : {}),
            ...(query.method
              ? { paymentMethod: query.method as PaymentMethod }
              : {}),
            ...(dateRange ? { soldAt: dateRange } : {}),
          },
          orderBy: { soldAt: 'desc' },
          include: { member: true, items: true },
        }),
        this.prisma.member.findMany({
          where: {
            organizationId,
            ...directGymScope(query),
            OR: [
              { status: { in: [MemberStatus.OVERDUE, MemberStatus.BLOCKED] } },
              {
                subscriptions: {
                  some: {
                    status: {
                      in: [
                        SubscriptionStatus.ACTIVE,
                        SubscriptionStatus.OVERDUE,
                      ],
                    },
                    endDate: { lt: now },
                  },
                },
              },
            ],
          },
          include: {
            subscriptions: {
              orderBy: { endDate: 'desc' },
              take: 1,
              include: { plan: true },
            },
          },
        }),
        this.prisma.financeAccount.findMany({
          where: { organizationId },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        }),
      ]);

    const paidPayments = payments.filter((payment) =>
      this.isPaid(payment.status),
    );
    const receivablePayments = payments.filter(
      (payment) => !this.isPaid(payment.status),
    );
    const paidExpenses = expenses.filter((expense) =>
      this.isPaid(expense.status),
    );
    const pendingExpenses = expenses.filter(
      (expense) => !this.isPaid(expense.status),
    );
    const completedSales = sales.filter(
      (sale) => sale.status === SaleStatus.COMPLETED,
    );
    const cancelledSales = sales.filter(
      (sale) =>
        sale.status === SaleStatus.CANCELLED ||
        sale.status === SaleStatus.REFUNDED,
    );

    const paymentsRevenue = sum(paidPayments, (payment) =>
      Number(payment.amount),
    );
    const receivable = sum(receivablePayments, (payment) =>
      Number(payment.amount),
    );
    const posRevenue = sum(completedSales, (sale) => Number(sale.total));
    const expensesPaidTotal = sum(paidExpenses, (expense) =>
      Number(expense.amount),
    );
    const expensesPendingTotal = sum(pendingExpenses, (expense) =>
      Number(expense.amount),
    );
    const totalRevenue = paymentsRevenue + receivable + posRevenue;
    const totalReceived = paymentsRevenue + posRevenue;
    const totalExpenses = expensesPaidTotal + expensesPendingTotal;
    const net = totalReceived - expensesPaidTotal;

    const revenueGroups = groupValue([
      ...payments.map((payment) => ({
        key: payment.subscription?.plan?.name ?? 'Pagamentos',
        value: Number(payment.amount),
      })),
      ...completedSales.map((sale) => ({
        key: 'Vendas POS',
        value: Number(sale.total),
      })),
    ]);
    const expenseGroups = groupValue(
      expenses.map((expense) => ({
        key: expense.category,
        value: Number(expense.amount),
      })),
    );
    const methodGroups = groupValue(
      completedSales.map((sale) => ({
        key: methodLabel(sale.paymentMethod),
        value: Number(sale.total),
      })),
    );
    const methodTransactions = groupCount(
      completedSales.map((sale) => methodLabel(sale.paymentMethod)),
    );
    const revenueSeries = this.seriesFromEvents(
      'Receitas',
      [
        ...payments.map((payment) => ({
          date: payment.paidAt ?? payment.createdAt,
          value: Number(payment.amount),
        })),
        ...completedSales.map((sale) => ({
          date: sale.soldAt,
          value: Number(sale.total),
        })),
      ],
      query,
      palette.lime,
    );
    const expenseSeries = this.seriesFromEvents(
      'Despesas',
      expenses.map((expense) => ({
        date: expense.paidAt ?? expense.createdAt,
        value: Number(expense.amount),
      })),
      query,
      palette.red,
    );
    const netSeries = {
      name: 'Saldo liquido',
      values: revenueSeries.values.map(
        (value, index) => value - expenseSeries.values[index],
      ),
      color: palette.blue,
    };
    const accountData = this.accountData({
      accounts,
      payments,
      expenses,
      sales: completedSales,
      currentBalanceFallback: totalReceived - expensesPaidTotal,
    });
    const overdueTotal = sum(members, (member) => this.overdueAmount(member));
    const labels = this.labels(query);

    return {
      period: this.periodLabel(query),
      labels,
      weekdays,
      records: [
        ...payments.map((payment) => ({
          id: payment.id,
          kind: 'Receita',
          category: payment.subscription?.plan?.name ?? 'Pagamentos',
          value: Number(payment.amount),
          date: this.dateLabel(payment.paidAt ?? payment.createdAt),
          status: statusLabel(payment.status, {
            PAID: 'Recebido',
            PENDING: 'Pendente',
            FAILED: 'Falhou',
            CANCELLED: 'Cancelado',
            REFUNDED: 'Reembolsado',
          }),
          note:
            payment.member?.name ?? payment.reference ?? payment.notes ?? '-',
          method: methodLabel(payment.method),
        })),
        ...expenses.map((expense) => ({
          id: expense.id,
          kind: 'Despesa',
          category: expense.category,
          value: Number(expense.amount),
          date: this.dateLabel(expense.paidAt ?? expense.createdAt),
          status: statusLabel(expense.status, {
            PAID: 'Pago',
            PENDING: 'Pendente',
            FAILED: 'Falhou',
            CANCELLED: 'Cancelado',
            REFUNDED: 'Reembolsado',
          }),
          note: expense.description,
          method: expense.method ? methodLabel(expense.method) : '-',
        })),
      ],
      recentRows: [
        ...payments.map((payment) => [
          this.dateLabel(payment.paidAt ?? payment.createdAt),
          'Receita',
          payment.subscription?.plan?.name ?? 'Pagamentos',
          money(Number(payment.amount)),
          statusLabel(payment.status, {
            PAID: 'Recebido',
            PENDING: 'Pendente',
            FAILED: 'Falhou',
            CANCELLED: 'Cancelado',
            REFUNDED: 'Reembolsado',
          }),
          payment.member?.name ?? payment.reference ?? payment.notes ?? '-',
        ]),
        ...expenses.map((expense) => [
          this.dateLabel(expense.paidAt ?? expense.createdAt),
          'Despesa',
          expense.category,
          money(Number(expense.amount)),
          statusLabel(expense.status, {
            PAID: 'Pago',
            PENDING: 'Pendente',
            FAILED: 'Falhou',
            CANCELLED: 'Cancelado',
            REFUNDED: 'Reembolsado',
          }),
          expense.description,
        ]),
      ].slice(0, 10),
      totals: {
        revenue: totalRevenue,
        received: totalReceived,
        receivable,
        expenses: totalExpenses,
        paidExpenses: expensesPaidTotal,
        pendingExpenses: expensesPendingTotal,
        net,
        posRevenue,
        posTransactions: completedSales.length,
      },
      overview: {
        kpis: [
          kpi('Receita total', money(totalRevenue), 'Pagamentos + POS', 'lime'),
          kpi('Receita recebida', money(totalReceived), 'Recebida', 'green'),
          kpi('Receita a receber', money(receivable), 'Pendente', 'yellow'),
          kpi(
            'Despesas totais',
            money(totalExpenses),
            'Pagas + pendentes',
            'red',
          ),
          kpi(
            'Lucro liquido',
            money(net),
            net >= 0 ? 'Positivo' : 'Negativo',
            net >= 0 ? 'lime' : 'red',
          ),
        ],
        evolution: [revenueSeries, expenseSeries, netSeries],
        categorySlices: slicesFromGroup(revenueGroups, totalRevenue),
        accountRows: accountData.table,
      },
      revenues: {
        kpis: [
          kpi('Receita total', money(totalRevenue), 'Periodo atual', 'lime'),
          kpi(
            'Recebido',
            money(totalReceived),
            `${percent(totalReceived, totalRevenue)}% do total`,
            'green',
          ),
          kpi('A receber', money(receivable), 'Pendente', 'yellow'),
          kpi(
            'Vendas POS',
            money(posRevenue),
            `${completedSales.length} transacoes`,
            'purple',
          ),
          kpi(
            'Ticket medio POS',
            money(div(posRevenue, completedSales.length || 1)),
            'Media por venda',
            'blue',
          ),
        ],
        evolution: [revenueSeries, movingAverageSeries(revenueSeries)],
        weekday: weekdayTotals([
          ...payments.map((payment) => ({
            date: payment.paidAt ?? payment.createdAt,
            value: Number(payment.amount),
          })),
          ...completedSales.map((sale) => ({
            date: sale.soldAt,
            value: Number(sale.total),
          })),
        ]),
        byCategory: slicesFromGroup(revenueGroups, totalRevenue),
        byPlan: slicesFromGroup(
          groupValue(
            payments.map((payment) => ({
              key: payment.subscription?.plan?.name ?? 'Sem plano',
              value: Number(payment.amount),
            })),
          ),
          paymentsRevenue,
        ),
        detailRows: rowsFromGroup(revenueGroups, totalRevenue),
        methods: topEntries(methodGroups, 5).map(([label, value]) => [
          label,
          money(value),
          Math.round(percentNumber(value, totalReceived)),
        ]),
        topClients: topEntries(
          groupValue([
            ...payments.map((payment) => ({
              key: payment.member?.name ?? 'Cliente nao identificado',
              value: Number(payment.amount),
            })),
            ...completedSales.map((sale) => ({
              key: sale.member?.name ?? sale.customerName ?? 'Consumidor final',
              value: Number(sale.total),
            })),
          ]),
          5,
        ).map(([name, value]) => [name, money(value)]),
      },
      expenses: {
        kpis: [
          kpi(
            'Despesas totais',
            money(totalExpenses),
            'Pagas + pendentes',
            'red',
          ),
          kpi('Despesas pagas', money(expensesPaidTotal), 'Confirmadas', 'red'),
          kpi(
            'Despesas pendentes',
            money(expensesPendingTotal),
            'A pagar',
            'yellow',
          ),
          kpi(
            '% da receita',
            `${percent(totalExpenses, totalRevenue)}%`,
            'Despesas / receita',
            'blue',
          ),
          kpi(
            'Maior categoria',
            topLabel(expenseGroups) || '-',
            'Maior gasto',
            'purple',
          ),
        ],
        evolution: [expenseSeries, movingAverageSeries(expenseSeries)],
        weekday: weekdayTotals(
          expenses.map((expense) => ({
            date: expense.paidAt ?? expense.createdAt,
            value: Number(expense.amount),
          })),
        ),
        byCategory: slicesFromGroup(expenseGroups, totalExpenses),
        byType: slicesFromGroup(
          groupValue(
            expenses.map((expense) => ({
              key: this.isPaid(expense.status) ? 'Pagas' : 'Pendentes',
              value: Number(expense.amount),
            })),
          ),
          totalExpenses,
        ),
        detailRows: rowsFromGroup(expenseGroups, totalExpenses),
        biggest: topEntries(expenseGroups, 5).map(([label, value]) => [
          label,
          money(value),
          Math.round(percentNumber(value, totalExpenses)),
        ]),
      },
      cashFlow: {
        kpis: [
          kpi('Entradas', money(totalReceived), 'Recebidas', 'lime'),
          kpi('Saidas', money(expensesPaidTotal), 'Pagas', 'red'),
          kpi(
            'Fluxo liquido',
            money(net),
            'Entradas - saidas',
            net >= 0 ? 'lime' : 'red',
          ),
          kpi(
            'Saldo atual',
            money(accountData.currentBalance),
            'Contas',
            'blue',
          ),
          kpi(
            'Pendente',
            money(receivable - expensesPendingTotal),
            'A receber - a pagar',
            'yellow',
          ),
        ],
        evolution: [revenueSeries, expenseSeries, netSeries],
        weekdayEntries: weekdayTotals([
          ...payments.map((payment) => ({
            date: payment.paidAt ?? payment.createdAt,
            value: Number(payment.amount),
          })),
          ...completedSales.map((sale) => ({
            date: sale.soldAt,
            value: Number(sale.total),
          })),
        ]),
        weekdayExits: weekdayTotals(
          expenses.map((expense) => ({
            date: expense.paidAt ?? expense.createdAt,
            value: Number(expense.amount),
          })),
        ),
        dailyRows: labels.map((label, index) => {
          const entries = revenueSeries.values[index] ?? 0;
          const exits = expenseSeries.values[index] ?? 0;
          return [
            label,
            money(entries),
            money(exits),
            signedMoney(entries - exits),
            money(
              accountData.initialBalance +
                sum(netSeries.values.slice(0, index + 1), (value) => value),
            ),
          ];
        }),
        origins: slicesFromGroup(revenueGroups, totalRevenue),
        exits: slicesFromGroup(expenseGroups, totalExpenses),
        currentBalance: accountData.currentBalance,
        initialBalance: accountData.initialBalance,
      },
      accounts: accountData,
      payments: {
        kpis: [
          kpi('Receita por metodos', money(posRevenue), 'Vendas POS', 'lime'),
          kpi('Transacoes', int(completedSales.length), 'Concluidas', 'blue'),
          kpi(
            'Ticket medio',
            money(div(posRevenue, completedSales.length || 1)),
            'Por metodo',
            'yellow',
          ),
          kpi(
            'Metodo lider',
            topLabel(methodGroups) || '-',
            'Maior volume',
            'purple',
          ),
          kpi(
            'Reembolsos/cancel.',
            money(sum(cancelledSales, (sale) => Number(sale.total))),
            'Fora do total',
            'red',
          ),
        ],
        evolution: topEntries(methodGroups, 4).map(([label, value], index) => ({
          name: label,
          values: distributeSlots(value),
          color: colors[index % colors.length],
        })),
        distribution: slicesFromGroup(methodGroups, posRevenue),
        transactions: topEntries(methodTransactions, 4).map(
          ([, value]) => value,
        ),
        performanceRows: topEntries(methodGroups, 6).map(([label, value]) => {
          const transactions = methodTransactions.get(label) ?? 0;
          return [
            label,
            money(value),
            `${percent(value, posRevenue)}%`,
            int(transactions),
            money(div(value, transactions || 1)),
            'Atual',
          ];
        }),
        cardForms: slicesFromGroup(
          groupValue(
            completedSales
              .filter((sale) =>
                includesAny(methodLabel(sale.paymentMethod), [
                  'cartao',
                  'card',
                  'multi',
                ]),
              )
              .map((sale) => ({
                key: methodLabel(sale.paymentMethod),
                value: Number(sale.total),
              })),
          ),
          posRevenue,
        ),
      },
      overdue: {
        kpis: [
          kpi(
            'Total em atraso',
            money(overdueTotal),
            `${members.length} clientes`,
            'red',
          ),
          kpi(
            'Clientes em atraso',
            int(members.length),
            'Status/vencimento',
            'yellow',
          ),
          kpi(
            'Ticket em atraso',
            money(div(overdueTotal, members.length || 1)),
            'Media por cliente',
            'yellow',
          ),
          kpi(
            'Taxa',
            `${percent(members.length, Math.max(members.length, 1))}%`,
            'Da base de clientes',
            'purple',
          ),
          kpi('A recuperar', money(overdueTotal), 'Potencial', 'lime'),
        ],
        evolution: [
          {
            name: 'Valor em atraso',
            values: distributeSlots(overdueTotal),
            color: palette.red,
          },
          {
            name: 'Clientes',
            values: distributeSlots(members.length),
            color: palette.gray,
          },
        ],
        delayRanges: this.delayRanges(members),
        origin: slicesFromGroup(this.overdueByPlan(members), overdueTotal),
        clients: members
          .slice(0, 10)
          .map((member) => [
            member.name,
            member.subscriptions[0]?.plan?.name ?? 'Sem plano',
            String(this.daysOverdue(member.subscriptions[0]?.endDate)),
            money(this.overdueAmount(member)),
            member.subscriptions[0]?.endDate
              ? this.dateLabel(member.subscriptions[0].endDate)
              : '-',
          ]),
        byPlan: slicesFromGroup(this.overdueByPlan(members), overdueTotal),
        actions: [
          [
            'Enviar lembrete',
            'Clientes com vencimento recente',
            `${members.filter((member) => this.daysOverdue(member.subscriptions[0]?.endDate) <= 15).length} contas`,
            money(
              sum(
                members.filter(
                  (member) =>
                    this.daysOverdue(member.subscriptions[0]?.endDate) <= 15,
                ),
                (member) => this.overdueAmount(member),
              ),
            ),
            'Enviar',
          ],
          [
            'Ligar para cliente',
            'Atraso acima de 30 dias',
            `${members.filter((member) => this.daysOverdue(member.subscriptions[0]?.endDate) > 30).length} contas`,
            money(
              sum(
                members.filter(
                  (member) =>
                    this.daysOverdue(member.subscriptions[0]?.endDate) > 30,
                ),
                (member) => this.overdueAmount(member),
              ),
            ),
            'Ligar',
          ],
          [
            'Negociar acordo',
            'Planos bloqueados ou vencidos',
            `${members.length} contas`,
            money(overdueTotal),
            'Negociar',
          ],
        ],
        total: overdueTotal,
        count: members.length,
      },
    };
  }

  async listAccounts(organizationId: string) {
    await this.ensureDefaultAccounts(organizationId);
    return this.prisma.financeAccount.findMany({
      where: { organizationId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAccount(organizationId: string, dto: CreateFinanceAccountDto) {
    await this.ensureDefaultAccounts(organizationId);
    if (dto.isDefault) await this.clearDefaultAccount(organizationId);

    return this.prisma.financeAccount.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        bank: dto.bank,
        type: dto.type ?? 'Corrente',
        openingBalance: dto.openingBalance ?? 0,
        balance: dto.balance ?? dto.openingBalance ?? 0,
        status: dto.status ?? 'ACTIVE',
        isDefault: dto.isDefault ?? false,
        color: dto.color ?? palette.lime,
      },
    });
  }

  async updateAccount(
    organizationId: string,
    id: string,
    dto: UpdateFinanceAccountDto,
  ) {
    await this.ensureAccount(organizationId, id);
    if (dto.isDefault) await this.clearDefaultAccount(organizationId);

    return this.prisma.financeAccount.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name?.trim(),
      },
    });
  }

  async listCategories(organizationId: string, kind?: string) {
    await this.ensureDefaultCategories(organizationId);
    return this.prisma.financeCategory.findMany({
      where: { organizationId, ...(kind ? { kind } : {}) },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(organizationId: string, dto: CreateFinanceCategoryDto) {
    return this.prisma.financeCategory.create({
      data: {
        organizationId,
        kind: dto.kind,
        name: dto.name.trim(),
        description: dto.description,
        color: dto.color ?? palette.lime,
        status: dto.status ?? 'ACTIVE',
        displayOrder: dto.displayOrder ?? 1,
      },
    });
  }

  async updateCategory(
    organizationId: string,
    id: string,
    dto: UpdateFinanceCategoryDto,
  ) {
    await this.ensureCategory(organizationId, id);

    return this.prisma.financeCategory.update({
      where: { id },
      data: {
        ...dto,
        name: dto.name?.trim(),
      },
    });
  }

  async removeCategory(organizationId: string, id: string) {
    const category = await this.ensureCategory(organizationId, id);
    const inUse = await this.prisma.expense.count({
      where: { organizationId, category: category.name },
    });
    if (inUse) {
      throw new BadRequestException('Finance category is in use');
    }

    return this.prisma.financeCategory.delete({ where: { id } });
  }

  async listCashSessions(organizationId: string, query: PaginationQueryDto) {
    const sessions = await this.prisma.cashSession.findMany({
      where: { organizationId, ...directGymScope(query) },
      orderBy: { openedAt: 'desc' },
      take: 50,
      include: {
        gym: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closing: {
          include: {
            closedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return Promise.all(
      sessions.map((session) => this.cashSessionPayload(session)),
    );
  }

  async currentCashSession(organizationId: string, query: PaginationQueryDto) {
    const session = await this.prisma.cashSession.findFirst({
      where: {
        organizationId,
        status: CashSessionStatus.OPEN,
        ...directGymScope(query),
      },
      orderBy: { openedAt: 'desc' },
      include: {
        gym: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closing: true,
      },
    });

    return session ? this.cashSessionPayload(session) : null;
  }

  async openCashSession(
    organizationId: string,
    userId: string,
    dto: OpenCashSessionDto,
  ) {
    if (dto.gymId) await this.ensureGym(organizationId, dto.gymId);

    const existing = await this.prisma.cashSession.findFirst({
      where: {
        organizationId,
        status: CashSessionStatus.OPEN,
        ...(dto.gymId ? { gymId: dto.gymId } : {}),
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Cash session already open');

    const session = await this.prisma.cashSession.create({
      data: {
        organizationId,
        gymId: dto.gymId,
        openedById: userId,
        openingAmount: dto.openingAmount ?? 0,
        notes: dto.notes,
      },
      include: {
        gym: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closing: true,
      },
    });

    return this.cashSessionPayload(session);
  }

  async closeCashSession(
    organizationId: string,
    userId: string,
    id: string,
    dto: CloseCashSessionDto,
  ) {
    const session = await this.prisma.cashSession.findFirst({
      where: { id, organizationId },
      include: { closing: true },
    });
    if (!session) throw new NotFoundException('Cash session not found');
    if (session.status !== CashSessionStatus.OPEN || session.closing) {
      throw new BadRequestException('Cash session is already closed');
    }

    const expected = await this.cashExpected(organizationId, {
      gymId: session.gymId,
      start: session.openedAt,
      end: new Date(),
      openingAmount: Number(session.openingAmount),
    });
    const actual = {
      cash: dto.actualCash ?? expected.cash,
      card: dto.actualCard ?? expected.card,
      transfer: dto.actualTransfer ?? expected.transfer,
      multicaixa: dto.actualMulticaixa ?? expected.multicaixa,
      pix: dto.actualPix ?? expected.pix,
      other: dto.actualOther ?? expected.other,
    };
    const actualTotal = this.cashTotal(actual);
    const difference = actualTotal - expected.total;

    await this.prisma.$transaction([
      this.prisma.cashClosing.create({
        data: {
          organizationId,
          sessionId: session.id,
          closedById: userId,
          expectedCash: expected.cash,
          actualCash: actual.cash,
          expectedCard: expected.card,
          actualCard: actual.card,
          expectedTransfer: expected.transfer,
          actualTransfer: actual.transfer,
          expectedMulticaixa: expected.multicaixa,
          actualMulticaixa: actual.multicaixa,
          expectedPix: expected.pix,
          actualPix: actual.pix,
          expectedOther: expected.other,
          actualOther: actual.other,
          expectedTotal: expected.total,
          actualTotal,
          difference,
          notes: dto.notes,
        },
      }),
      this.prisma.cashSession.update({
        where: { id: session.id },
        data: { status: CashSessionStatus.CLOSED },
      }),
    ]);

    const closed = await this.prisma.cashSession.findUnique({
      where: { id: session.id },
      include: {
        gym: { select: { id: true, name: true } },
        openedBy: { select: { id: true, name: true, email: true } },
        closing: {
          include: {
            closedBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return this.cashSessionPayload(closed);
  }

  private async cashSessionPayload(session: any) {
    const expected =
      session.status === CashSessionStatus.OPEN
        ? await this.cashExpected(session.organizationId, {
            gymId: session.gymId,
            start: session.openedAt,
            end: new Date(),
            openingAmount: Number(session.openingAmount),
          })
        : {
            cash: Number(session.closing?.expectedCash ?? 0),
            card: Number(session.closing?.expectedCard ?? 0),
            transfer: Number(session.closing?.expectedTransfer ?? 0),
            multicaixa: Number(session.closing?.expectedMulticaixa ?? 0),
            pix: Number(session.closing?.expectedPix ?? 0),
            other: Number(session.closing?.expectedOther ?? 0),
            total: Number(session.closing?.expectedTotal ?? 0),
          };
    const actual = session.closing
      ? {
          cash: Number(session.closing.actualCash),
          card: Number(session.closing.actualCard),
          transfer: Number(session.closing.actualTransfer),
          multicaixa: Number(session.closing.actualMulticaixa),
          pix: Number(session.closing.actualPix),
          other: Number(session.closing.actualOther),
          total: Number(session.closing.actualTotal),
        }
      : null;

    return {
      id: session.id,
      organizationId: session.organizationId,
      gymId: session.gymId,
      gymName: session.gym?.name,
      status: session.status,
      openingAmount: Number(session.openingAmount),
      openedAt: session.openedAt,
      openedBy: session.openedBy
        ? {
            id: session.openedBy.id,
            name: session.openedBy.name,
            email: session.openedBy.email,
          }
        : null,
      notes: session.notes,
      expected,
      actual,
      difference: Number(session.closing?.difference ?? 0),
      closedAt: session.closing?.closedAt,
      closedBy: session.closing?.closedBy
        ? {
            id: session.closing.closedBy.id,
            name: session.closing.closedBy.name,
            email: session.closing.closedBy.email,
          }
        : null,
      closingNotes: session.closing?.notes,
    };
  }

  private async cashExpected(
    organizationId: string,
    input: {
      gymId?: string | null;
      start: Date;
      end: Date;
      openingAmount: number;
    },
  ) {
    const dateRange = { gte: input.start, lte: input.end };
    const [payments, expenses] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where: {
          organizationId,
          status: PaymentStatus.PAID,
          OR: [{ paidAt: dateRange }, { paidAt: null, createdAt: dateRange }],
          ...(input.gymId ? { sale: { gymId: input.gymId } } : {}),
        },
        select: { amount: true, method: true },
      }),
      this.prisma.expense.findMany({
        where: {
          organizationId,
          status: PaymentStatus.PAID,
          OR: [{ paidAt: dateRange }, { paidAt: null, createdAt: dateRange }],
        },
        select: { amount: true, method: true },
      }),
    ]);

    const expected = {
      cash: input.openingAmount,
      card: 0,
      transfer: 0,
      multicaixa: 0,
      pix: 0,
      other: 0,
    };
    payments.forEach((payment) => {
      expected[this.cashBucket(payment.method)] += Number(payment.amount);
    });
    expenses.forEach((expense) => {
      expected[this.cashBucket(expense.method ?? PaymentMethod.OTHER)] -=
        Number(expense.amount);
    });

    return { ...expected, total: this.cashTotal(expected) };
  }

  private cashBucket(method: PaymentMethod) {
    if (method === PaymentMethod.CASH) return 'cash' as const;
    if (method === PaymentMethod.CARD) return 'card' as const;
    if (
      method === PaymentMethod.BANK_TRANSFER ||
      method === PaymentMethod.DIRECT_DEBIT
    )
      return 'transfer' as const;
    if (method === PaymentMethod.MULTICAIXA) return 'multicaixa' as const;
    if (method === PaymentMethod.PIX) return 'pix' as const;
    return 'other' as const;
  }

  private cashTotal(values: {
    cash: number;
    card: number;
    transfer: number;
    multicaixa: number;
    pix: number;
    other: number;
  }) {
    return (
      values.cash +
      values.card +
      values.transfer +
      values.multicaixa +
      values.pix +
      values.other
    );
  }

  private async ensureGym(organizationId: string, gymId: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId },
      select: { id: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');
  }

  private accountData(input: {
    accounts: Array<{
      name: string;
      bank: string | null;
      type: string;
      balance: unknown;
      openingBalance: unknown;
      status: string;
      isDefault: boolean;
      color: string;
    }>;
    payments: Array<{ amount: unknown; method: unknown }>;
    expenses: Array<{ amount: unknown; status: PaymentStatus }>;
    sales: Array<{ total: unknown; paymentMethod: unknown }>;
    currentBalanceFallback: number;
  }) {
    const accounts = input.accounts.length
      ? input.accounts
      : [
          {
            name: 'Caixa principal',
            bank: 'Interno',
            type: 'Caixa',
            balance: input.currentBalanceFallback,
            openingBalance: 0,
            status: 'ACTIVE',
            isDefault: true,
            color: palette.lime,
          },
        ];

    const rows = accounts.map((account) => {
      const entries =
        sum(
          input.payments.filter((payment) =>
            this.methodMatchesAccount(
              payment.method,
              account.name,
              account.type,
            ),
          ),
          (payment) => Number(payment.amount),
        ) +
        sum(
          input.sales.filter((sale) =>
            this.methodMatchesAccount(
              sale.paymentMethod,
              account.name,
              account.type,
            ),
          ),
          (sale) => Number(sale.total),
        );
      const exits = sum(input.expenses, (expense) =>
        this.isPaid(expense.status) ? Number(expense.amount) : 0,
      );
      const balance = Number(account.balance) + entries - exits;
      return [
        account.name,
        account.bank ?? '-',
        account.type,
        money(balance),
        money(balance),
        money(entries),
        money(exits),
        account.status === 'ACTIVE' ? 'Ativa' : account.status,
      ];
    });
    const currentBalance = sum(rows, (row) => parseMoney(row[3]));
    const initialBalance = sum(accounts, (account) =>
      Number(account.openingBalance),
    );
    const distributionGroup = new Map(
      rows.map((row) => [row[0], parseMoney(row[3])]),
    );

    return {
      currentBalance,
      initialBalance,
      cards: rows.map((row, index) => [
        row[0],
        row[3],
        row[5],
        row[6],
        accounts[index]?.isDefault ? 'Principal' : '',
        accounts[index]?.color ?? colors[index % colors.length],
      ]),
      table: rows,
      distribution: slicesFromGroup(distributionGroup, currentBalance),
      transactions: rows.map((row) => [
        this.dateLabel(new Date()),
        row[0],
        `Movimento consolidado - ${row[0]}`,
        'Conta',
        row[2],
        row[3],
        row[3],
      ]),
      cashByAccount: rows.map((row, index) => ({
        name: row[0],
        values: distributeSlots(parseMoney(row[5])),
        color: accounts[index]?.color ?? colors[index % colors.length],
      })),
    };
  }

  private async ensureDefaults(organizationId: string) {
    await Promise.all([
      this.ensureDefaultAccounts(organizationId),
      this.ensureDefaultCategories(organizationId),
    ]);
  }

  private async ensureDefaultAccounts(organizationId: string) {
    const count = await this.prisma.financeAccount.count({
      where: { organizationId },
    });
    if (count) return;

    await this.prisma.financeAccount.createMany({
      data: [
        {
          organizationId,
          name: 'Caixa principal',
          bank: 'Interno',
          type: 'Caixa',
          openingBalance: 0,
          balance: 0,
          status: 'ACTIVE',
          isDefault: true,
          color: palette.lime,
        },
        {
          organizationId,
          name: 'Conta operacional',
          bank: 'Banco',
          type: 'Corrente',
          openingBalance: 0,
          balance: 0,
          status: 'ACTIVE',
          color: palette.blue,
        },
        {
          organizationId,
          name: 'Conta cartoes',
          bank: 'POS',
          type: 'Cartao',
          openingBalance: 0,
          balance: 0,
          status: 'ACTIVE',
          color: palette.purple,
        },
      ],
    });
  }

  private async ensureDefaultCategories(organizationId: string) {
    const count = await this.prisma.financeCategory.count({
      where: { organizationId },
    });
    if (count) return;

    await this.prisma.financeCategory.createMany({
      data: [
        {
          organizationId,
          kind: 'Receita',
          name: 'Mensalidades',
          color: palette.lime,
        },
        {
          organizationId,
          kind: 'Receita',
          name: 'Vendas POS',
          color: palette.orange,
        },
        {
          organizationId,
          kind: 'Receita',
          name: 'Aulas avulsas',
          color: palette.purple,
        },
        {
          organizationId,
          kind: 'Despesa',
          name: 'Salarios',
          color: palette.red,
        },
        {
          organizationId,
          kind: 'Despesa',
          name: 'Aluguel',
          color: palette.orange,
        },
        {
          organizationId,
          kind: 'Despesa',
          name: 'Marketing',
          color: palette.blue,
        },
        {
          organizationId,
          kind: 'Despesa',
          name: 'Manutencao',
          color: palette.yellow,
        },
        {
          organizationId,
          kind: 'Despesa',
          name: 'Operacional',
          color: palette.gray,
        },
      ],
    });
  }

  private async ensureAccount(organizationId: string, id: string) {
    const account = await this.prisma.financeAccount.findFirst({
      where: { id, organizationId },
    });
    if (!account) throw new NotFoundException('Finance account not found');
    return account;
  }

  private async ensureCategory(organizationId: string, id: string) {
    const category = await this.prisma.financeCategory.findFirst({
      where: { id, organizationId },
    });
    if (!category) throw new NotFoundException('Finance category not found');
    return category;
  }

  private async clearDefaultAccount(organizationId: string) {
    await this.prisma.financeAccount.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private dateRange(query: PaginationQueryDto) {
    if (!query.startDate && !query.endDate) return undefined;
    return {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: endOfDay(new Date(query.endDate)) } : {}),
    };
  }

  private labels(query: PaginationQueryDto) {
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const count = 7;
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(end);
      date.setDate(end.getDate() - (count - index - 1));
      return this.shortDate(date);
    });
  }

  private seriesFromEvents(
    name: string,
    events: Array<{ date: Date; value: number }>,
    query: PaginationQueryDto,
    color: string,
  ) {
    const labels = this.labels(query);
    const values = labels.map((label) =>
      Math.round(
        sum(
          events.filter((event) => this.shortDate(event.date) === label),
          (event) => event.value,
        ),
      ),
    );
    return { name, values, color };
  }

  private periodLabel(query: PaginationQueryDto) {
    const end = query.endDate ? new Date(query.endDate) : new Date();
    const start = query.startDate
      ? new Date(query.startDate)
      : new Date(end.getFullYear(), end.getMonth(), 1);
    return `${this.dateLabel(start)} - ${this.dateLabel(end)}`;
  }

  private shortDate(date: Date) {
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
    }).format(date);
  }

  private dateLabel(date: Date) {
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  private isPaid(status: PaymentStatus) {
    return status === PaymentStatus.PAID;
  }

  private methodMatchesAccount(
    method: unknown,
    accountName: string,
    type: string,
  ) {
    const methodText = methodLabel(method).toLocaleLowerCase('pt-AO');
    const accountText = `${accountName} ${type}`.toLocaleLowerCase('pt-AO');
    if (accountText.includes('cart') || accountText.includes('pos')) {
      return includesAny(methodText, ['cart', 'multi']);
    }
    if (accountText.includes('caixa')) {
      return includesAny(methodText, ['dinheiro', 'cash']);
    }
    return includesAny(methodText, ['transfer', 'pix', 'refer', 'banco']);
  }

  private daysOverdue(date?: Date | null) {
    if (!date) return 30;
    return Math.max(0, Math.ceil((Date.now() - date.getTime()) / 86400000));
  }

  private overdueAmount(member: {
    subscriptions: Array<{ plan?: { price: unknown } | null }>;
  }) {
    return Number(member.subscriptions[0]?.plan?.price ?? 10000);
  }

  private delayRanges(
    members: Array<{ subscriptions: Array<{ endDate: Date }> }>,
  ) {
    const ranges = [0, 0, 0, 0, 0];
    members.forEach((member) => {
      const days = this.daysOverdue(member.subscriptions[0]?.endDate);
      if (days <= 15) ranges[0] += 1;
      else if (days <= 30) ranges[1] += 1;
      else if (days <= 60) ranges[2] += 1;
      else if (days <= 90) ranges[3] += 1;
      else ranges[4] += 1;
    });
    return ranges;
  }

  private overdueByPlan(
    members: Array<{
      subscriptions: Array<{ plan?: { name: string; price: unknown } | null }>;
    }>,
  ) {
    return groupValue(
      members.map((member) => ({
        key: member.subscriptions[0]?.plan?.name ?? 'Sem plano',
        value: this.overdueAmount(member),
      })),
    );
  }
}

function kpi(title: string, value: string, change: string, tone: string) {
  return { title, value, change, tone };
}

function slicesFromGroup(group: Map<string, number>, total: number) {
  const entries = topEntries(group, 6);
  if (!entries.length) {
    return [{ label: 'Sem dados', value: 0, amount: '0 Kz', color: colors[0] }];
  }
  return entries.map(([label, value], index) => ({
    label,
    value: percentNumber(value, total),
    amount: money(value),
    color: colors[index % colors.length],
  }));
}

function rowsFromGroup(group: Map<string, number>, total: number) {
  return topEntries(group, 8).map(([label, value]) => [
    label,
    money(value),
    `${percent(value, total)}%`,
    'Atual',
  ]);
}

function groupValue(items: Array<{ key: string; value: number }>) {
  const group = new Map<string, number>();
  items.forEach((item) => {
    const key = item.key || 'Sem dados';
    group.set(key, (group.get(key) ?? 0) + item.value);
  });
  return group;
}

function groupCount(items: string[]) {
  const group = new Map<string, number>();
  items.forEach((item) =>
    group.set(item || 'Sem dados', (group.get(item || 'Sem dados') ?? 0) + 1),
  );
  return group;
}

function topEntries(group: Map<string, number>, limit = 5) {
  return [...group.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function topLabel(group: Map<string, number>) {
  return topEntries(group, 1)[0]?.[0] ?? '';
}

function weekdayTotals(events: Array<{ date: Date; value: number }>) {
  const totals = new Array(7).fill(0);
  events.forEach((event) => {
    const index = (event.date.getDay() + 6) % 7;
    totals[index] += event.value;
  });
  return totals.map((value) => Math.round(value));
}

function distributeSlots(total: number) {
  const ratios = [0.1, 0.14, 0.11, 0.16, 0.2, 0.17, 0.12];
  return ratios.map((ratio) => Math.round(total * ratio));
}

function movingAverageSeries(series: { name: string; values: number[] }) {
  return {
    name: 'Media movel',
    color: palette.gray,
    values: series.values.map((_, index) => {
      const start = Math.max(0, index - 2);
      const slice = series.values.slice(start, index + 1);
      return Math.round(
        div(
          sum(slice, (value) => value),
          slice.length || 1,
        ),
      );
    }),
  };
}

function sum<T>(items: T[], getValue: (item: T) => number) {
  return items.reduce((total, item) => total + getValue(item), 0);
}

function div(value: number, total: number) {
  return total > 0 ? value / total : 0;
}

function percent(value: number, total: number) {
  return Math.round(percentNumber(value, total)).toLocaleString('pt-AO');
}

function percentNumber(value: number, total: number) {
  return total > 0 ? Math.max(0, (value / total) * 100) : 0;
}

function money(value: number) {
  return `${Math.round(value).toLocaleString('pt-AO')} Kz`;
}

function signedMoney(value: number) {
  return `${value >= 0 ? '+' : '-'}${money(Math.abs(value))}`;
}

function int(value: number) {
  return Math.round(value).toLocaleString('pt-AO');
}

function parseMoney(value: string) {
  const parsed = Number(
    String(value ?? '0')
      .replace(/[^\d,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.'),
  );
  return Number.isFinite(parsed) ? parsed : 0;
}

function methodLabel(value: unknown) {
  const labels: Record<string, string> = {
    CASH: 'Dinheiro',
    BANK_TRANSFER: 'Transferencia',
    CARD: 'Cartao',
    MULTICAIXA: 'Multicaixa',
    PIX: 'PIX',
    DIRECT_DEBIT: 'Debito direto',
    OTHER: 'Outro',
  };
  return labels[String(value)] ?? String(value ?? 'Dinheiro');
}

function statusLabel(value: unknown, labels: Record<string, string>) {
  return labels[String(value)] ?? String(value ?? '');
}

function includesAny(value: string, needles: string[]) {
  const normalized = value.toLocaleLowerCase('pt-AO');
  return needles.some((needle) => normalized.includes(needle));
}

function endOfDay(date: Date) {
  date.setHours(23, 59, 59, 999);
  return date;
}
