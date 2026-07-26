import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CashSessionStatus,
  PaymentStatus,
  PlanStatus,
  Prisma,
  SaleStatus,
  StockMovementType,
  SubscriptionStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { hasScope, saleGymScope } from '../common/utils/gym-scope';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateSaleDto,
  CreateSaleItemDto,
  CreateSalePaymentDto,
} from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';

type BuiltSaleItem = {
  productId?: string;
  planId?: string;
  classId?: string;
  kind?: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  total: number;
  trackStock: boolean;
  durationDays?: number;
};

type NormalizedPayment = {
  method: CreateSalePaymentDto['method'];
  amount: number;
  reference?: string;
};

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const scope = saleGymScope(query);
    const where: Prisma.SaleWhereInput = {
      organizationId,
      ...(hasScope(scope) ? { AND: [scope] } : {}),
      ...(query.status ? { status: query.status as SaleStatus } : {}),
      ...(query.startDate || query.endDate
        ? {
            soldAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { customerName: { contains: query.search } },
              { sellerName: { contains: query.search } },
              {
                member: {
                  name: { contains: query.search },
                },
              },
              {
                items: {
                  some: {
                    productName: {
                      contains: query.search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { soldAt: 'desc' },
        include: this.saleInclude(),
      }),
      this.prisma.sale.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: this.saleInclude(),
    });
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async create(organizationId: string, sellerId: string, dto: CreateSaleDto) {
    await this.validateRelations(organizationId, sellerId, dto);
    const saleItems = await this.buildSaleItems(organizationId, dto.items);
    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = dto.discountAmount ?? 0;
    if (discountAmount > 0 && !dto.discountReason?.trim()) {
      throw new BadRequestException('Discount reason is required');
    }
    const taxAmount = dto.taxAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount;
    const soldAt = dto.soldAt ?? new Date();
    const status = dto.status ?? SaleStatus.COMPLETED;
    const hasMembershipItem = saleItems.some(
      (item) => item.planId || item.classId,
    );
    if (status === SaleStatus.COMPLETED && hasMembershipItem && !dto.memberId) {
      throw new BadRequestException('Member is required for plans and classes');
    }
    if (total < 0)
      throw new BadRequestException('Sale total cannot be negative');
    const normalizedPayments =
      status === SaleStatus.COMPLETED
        ? this.normalizePayments(dto, total)
        : [];
    const paymentTotal = normalizedPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    const amountReceived =
      status === SaleStatus.COMPLETED
        ? Math.max(dto.amountReceived ?? 0, paymentTotal)
        : (dto.amountReceived ?? 0);
    const changeAmount =
      status === SaleStatus.COMPLETED
        ? Math.max(0, amountReceived - total)
        : (dto.changeAmount ?? 0);

    return this.prisma.$transaction(async (tx) => {
      if (status === SaleStatus.COMPLETED && dto.cashSessionId) {
        await this.ensureOpenCashSession(tx, organizationId, dto);
      }
      const receiptNumber =
        status === SaleStatus.COMPLETED
          ? await this.nextReceiptNumber(tx, organizationId, soldAt)
          : undefined;
      const sale = await tx.sale.create({
        data: {
          organizationId,
          gymId: dto.gymId,
          memberId: dto.memberId,
          sellerId,
          cashSessionId: dto.cashSessionId,
          customerName: dto.customerName,
          sellerName: dto.sellerName,
          type: dto.type,
          status,
          subtotal,
          discountAmount,
          discountReason: dto.discountReason,
          taxAmount,
          total,
          paymentMethod: dto.paymentMethod,
          amountReceived,
          changeAmount,
          paymentReference: dto.paymentReference,
          receiptNumber,
          soldAt,
          notes: dto.notes,
          items: {
            create: saleItems.map((item) => ({
              productId: item.productId,
              planId: item.planId,
              classId: item.classId,
              kind: item.kind,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              total: item.total,
            })),
          },
        },
        include: this.saleInclude(),
      });

      if (sale.status === SaleStatus.COMPLETED) {
        for (const item of saleItems) {
          if (!item.productId || !item.trackStock) continue;
          const update = await tx.product.updateMany({
            where: {
              id: item.productId,
              organizationId,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (update.count !== 1) {
            throw new BadRequestException(
              `Insufficient stock for ${item.productName}`,
            );
          }
          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: item.productId,
              type: StockMovementType.SALE,
              quantity: item.quantity,
              reason: 'POS sale',
              reference: sale.id,
            },
          });
        }

        const subscriptionIds = await this.applyMembershipItems(tx, {
          organizationId,
          memberId: dto.memberId,
          saleItems,
          soldAt,
        });
        const subscriptionId =
          subscriptionIds.length === 1 ? subscriptionIds[0] : undefined;
        await this.createPaidPayments(tx, {
          organizationId,
          memberId: dto.memberId,
          saleId: sale.id,
          subscriptionId,
          receiptNumber: receiptNumber ?? sale.id,
          soldAt,
          total,
          payments: normalizedPayments,
          fallbackReference: dto.paymentReference ?? sale.id,
          notes: dto.notes,
        });
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
        include: this.saleInclude(),
      });
    });
  }

  async update(
    organizationId: string,
    sellerId: string,
    id: string,
    dto: UpdateSaleDto,
  ) {
    const current = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      select: { id: true, status: true },
    });
    if (!current) throw new NotFoundException('Sale not found');
    if (current.status !== SaleStatus.DRAFT) {
      throw new BadRequestException('Only draft sales can be edited');
    }

    if (!dto.items?.length || !dto.paymentMethod) {
      throw new BadRequestException('Sale items and payment method are required');
    }

    await this.validateRelations(organizationId, sellerId, dto as CreateSaleDto);
    const saleItems = await this.buildSaleItems(organizationId, dto.items);
    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discountAmount = dto.discountAmount ?? 0;
    if (discountAmount > 0 && !dto.discountReason?.trim()) {
      throw new BadRequestException('Discount reason is required');
    }
    const taxAmount = dto.taxAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount;
    if (total < 0) {
      throw new BadRequestException('Sale total cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.saleItem.deleteMany({ where: { saleId: id } });
      await tx.payment.deleteMany({ where: { saleId: id, organizationId } });

      await tx.sale.update({
        where: { id },
        data: {
          gymId: dto.gymId,
          memberId: dto.memberId,
          sellerId,
          customerName: dto.customerName,
          sellerName: dto.sellerName,
          type: dto.type,
          status: SaleStatus.DRAFT,
          subtotal,
          discountAmount,
          discountReason: dto.discountReason,
          taxAmount,
          total,
          paymentMethod: dto.paymentMethod,
          amountReceived: dto.amountReceived,
          changeAmount: dto.changeAmount ?? 0,
          paymentReference: dto.paymentReference,
          soldAt: dto.soldAt ?? new Date(),
          notes: dto.notes,
          items: {
            create: saleItems.map((item) => ({
              productId: item.productId,
              planId: item.planId,
              classId: item.classId,
              kind: item.kind,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              unitCost: item.unitCost,
              total: item.total,
            })),
          },
        },
      });

      return tx.sale.findUnique({
        where: { id },
        include: this.saleInclude(),
      });
    });
  }

  async cancel(organizationId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, organizationId },
      include: { items: { include: { product: true } }, payments: true },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (sale.status === SaleStatus.CANCELLED) return sale;
    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException('Refunded sales cannot be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      if (sale.status === SaleStatus.COMPLETED) {
        for (const item of sale.items) {
          if (!item.productId || !item.product?.trackStock) continue;
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          await tx.stockMovement.create({
            data: {
              organizationId,
              productId: item.productId,
              type: StockMovementType.RETURN,
              quantity: item.quantity,
              reason: 'Cancelled sale',
              reference: sale.id,
            },
          });
        }
      }

      await tx.payment.updateMany({
        where: { saleId: id, organizationId },
        data: { status: PaymentStatus.CANCELLED },
      });

      return tx.sale.update({
        where: { id },
        data: { status: SaleStatus.CANCELLED },
        include: this.saleInclude(),
      });
    });
  }

  private async buildSaleItems(
    organizationId: string,
    items: CreateSaleItemDto[],
  ): Promise<BuiltSaleItem[]> {
    const productIds = items
      .map((item) => item.productId)
      .filter((productId): productId is string => Boolean(productId));
    const planIds = items
      .map((item) => item.planId)
      .filter((planId): planId is string => Boolean(planId));
    const classIds = items
      .map((item) => item.classId)
      .filter((classId): classId is string => Boolean(classId));
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { organizationId, id: { in: productIds } },
        })
      : [];
    const plans = planIds.length
      ? await this.prisma.plan.findMany({
          where: {
            organizationId,
            id: { in: planIds },
            status: PlanStatus.ACTIVE,
          },
        })
      : [];
    const classes = classIds.length
      ? await this.prisma.gymClass.findMany({
          where: { organizationId, id: { in: classIds } },
        })
      : [];

    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException('One or more sale products were not found');
    }
    if (plans.length !== new Set(planIds).size) {
      throw new NotFoundException('One or more sale plans were not found');
    }
    if (classes.length !== new Set(classIds).size) {
      throw new NotFoundException('One or more sale classes were not found');
    }

    return items.map((item) => {
      const product = item.productId
        ? products.find((entry) => entry.id === item.productId)
        : undefined;
      const plan = item.planId
        ? plans.find((entry) => entry.id === item.planId)
        : undefined;
      const gymClass = item.classId
        ? classes.find((entry) => entry.id === item.classId)
        : undefined;
      const unitPrice = product
        ? Number(product.price)
        : plan
          ? Number(plan.price)
          : (item.unitPrice ?? 0);
      const productName = product?.name ?? plan?.name ?? gymClass?.name ?? item.productName;
      if (!productName) {
        throw new BadRequestException('Sale item productName is required');
      }
      if (unitPrice <= 0) {
        throw new BadRequestException('Sale item unitPrice must be positive');
      }
      if (product?.trackStock && product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for ${product.name}`);
      }

      return {
        productId: product?.id,
        planId: plan?.id,
        classId: gymClass?.id,
        kind:
          item.kind ??
          (product ? 'product' : plan ? 'plan' : gymClass ? 'class' : 'service'),
        productName,
        sku: product?.sku ?? item.sku,
        quantity: item.quantity,
        unitPrice,
        unitCost: product ? Number(product.cost) : undefined,
        total: unitPrice * item.quantity,
        trackStock: product?.trackStock ?? false,
        durationDays: plan?.durationDays,
      };
    });
  }

  private normalizePayments(dto: CreateSaleDto, total: number) {
    const payments: NormalizedPayment[] = dto.payments?.length
      ? dto.payments.map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount),
          reference: payment.reference,
        }))
      : [
          {
            method: dto.paymentMethod,
            amount: total,
            reference: dto.paymentReference,
          },
        ];
    const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
    if (paid + 0.001 < total) {
      throw new BadRequestException('Payment amount is below sale total');
    }
    return payments;
  }

  private async ensureOpenCashSession(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: CreateSaleDto,
  ) {
    const session = await tx.cashSession.findFirst({
      where: {
        id: dto.cashSessionId,
        organizationId,
        status: CashSessionStatus.OPEN,
      },
      select: { id: true, gymId: true },
    });
    if (!session) {
      throw new BadRequestException('Cash session is not open');
    }
    if (session.gymId && dto.gymId && session.gymId !== dto.gymId) {
      throw new BadRequestException('Cash session belongs to another gym');
    }
  }

  private async nextReceiptNumber(
    tx: Prisma.TransactionClient,
    organizationId: string,
    soldAt: Date,
  ) {
    const year = soldAt.getUTCFullYear();
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const sequence = await tx.sale.count({
      where: {
        organizationId,
        soldAt: { gte: start, lt: end },
        receiptNumber: { not: null },
      },
    });
    return `REC-${year}-${String(sequence + 1).padStart(6, '0')}`;
  }

  private async applyMembershipItems(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      memberId?: string;
      saleItems: BuiltSaleItem[];
      soldAt: Date;
    },
  ) {
    if (!input.memberId) return [];
    const subscriptionIds: string[] = [];

    for (const item of input.saleItems) {
      if (item.planId) {
        const latest = await tx.subscription.findFirst({
          where: {
            organizationId: input.organizationId,
            memberId: input.memberId,
            planId: item.planId,
            status: {
              in: [
                SubscriptionStatus.ACTIVE,
                SubscriptionStatus.PAUSED,
                SubscriptionStatus.OVERDUE,
              ],
            },
          },
          orderBy: { endDate: 'desc' },
          select: { endDate: true },
        });
        const startDate =
          latest?.endDate && latest.endDate > input.soldAt
            ? latest.endDate
            : input.soldAt;
        const endDate = new Date(startDate);
        endDate.setUTCDate(
          endDate.getUTCDate() + (item.durationDays ?? 30) * item.quantity,
        );
        const subscription = await tx.subscription.create({
          data: {
            organizationId: input.organizationId,
            memberId: input.memberId,
            planId: item.planId,
            status: SubscriptionStatus.ACTIVE,
            startDate,
            endDate,
            nextBillingDate: endDate,
          },
          select: { id: true },
        });
        subscriptionIds.push(subscription.id);
      }

      if (item.classId) {
        const existing = await tx.classEnrollment.findUnique({
          where: {
            classId_memberId: {
              classId: item.classId,
              memberId: input.memberId,
            },
          },
          select: { id: true },
        });
        if (!existing) {
          await tx.classEnrollment.create({
            data: {
              classId: item.classId,
              memberId: input.memberId,
            },
          });
          await tx.gymClass.update({
            where: { id: item.classId },
            data: { participants: { increment: 1 } },
          });
        }
      }
    }

    return subscriptionIds;
  }

  private async createPaidPayments(
    tx: Prisma.TransactionClient,
    input: {
      organizationId: string;
      memberId?: string;
      saleId: string;
      subscriptionId?: string;
      receiptNumber: string;
      soldAt: Date;
      total: number;
      payments: NormalizedPayment[];
      fallbackReference: string;
      notes?: string;
    },
  ) {
    let remaining = input.total;
    for (const [index, payment] of input.payments.entries()) {
      if (remaining <= 0) break;
      const amount = Math.min(payment.amount, remaining);
      if (amount <= 0) continue;
      remaining -= amount;
      await tx.payment.create({
        data: {
          organizationId: input.organizationId,
          memberId: input.memberId,
          subscriptionId: input.subscriptionId,
          saleId: input.saleId,
          amount,
          grossAmount: amount,
          discountAmount: 0,
          lateFeeAmount: 0,
          outstandingAmount: 0,
          method: payment.method,
          status: PaymentStatus.PAID,
          paidAt: input.soldAt,
          reference: payment.reference ?? input.fallbackReference,
          receiptNumber:
            index === 0
              ? input.receiptNumber
              : `${input.receiptNumber}-${index + 1}`,
          notes: input.notes,
        },
      });
    }
  }

  private async validateRelations(
    organizationId: string,
    sellerId: string,
    dto: CreateSaleDto,
  ) {
    const checks: Promise<unknown>[] = [
      this.prisma.user.findFirst({
        where: { id: sellerId, organizationId },
        select: { id: true },
      }),
    ];

    if (dto.gymId) {
      checks.push(
        this.prisma.gym.findFirst({
          where: { id: dto.gymId, organizationId },
          select: { id: true },
        }),
      );
    }
    if (dto.memberId) {
      const member = await this.prisma.member.findFirst({
        where: { id: dto.memberId, organizationId },
        select: { id: true, status: true },
      });
      if (!member) {
        throw new NotFoundException('Related sale entity not found');
      }
      assertActiveMember(member);
    }
    const results = await Promise.all(checks);
    if (results.some((result) => !result)) {
      throw new NotFoundException('Related sale entity not found');
    }
  }

  private saleInclude() {
    return {
      cashSession: true,
      gym: true,
      member: true,
      seller: { select: { id: true, name: true, email: true } },
      items: { include: { product: true, plan: true, gymClass: true } },
      payments: true,
    };
  }
}
