import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaymentStatus,
  Prisma,
  SaleStatus,
  StockMovementType,
} from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSaleDto, CreateSaleItemDto } from './dto/create-sale.dto';

@Injectable()
export class SalesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.SaleWhereInput = {
      organizationId,
      ...(query.gymId ? { gymId: query.gymId } : {}),
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
    const taxAmount = dto.taxAmount ?? 0;
    const total = subtotal - discountAmount + taxAmount;
    if (total < 0)
      throw new BadRequestException('Sale total cannot be negative');

    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          organizationId,
          gymId: dto.gymId,
          memberId: dto.memberId,
          sellerId,
          customerName: dto.customerName,
          sellerName: dto.sellerName,
          type: dto.type,
          status: dto.status ?? SaleStatus.COMPLETED,
          subtotal,
          discountAmount,
          taxAmount,
          total,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          items: {
            create: saleItems.map((item) => ({
              productId: item.productId,
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
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          });
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

        await tx.payment.create({
          data: {
            organizationId,
            memberId: dto.memberId,
            saleId: sale.id,
            amount: total,
            method: dto.paymentMethod,
            status: PaymentStatus.PAID,
            paidAt: new Date(),
            reference: sale.id,
            notes: dto.notes,
          },
        });
      }

      return tx.sale.findUnique({
        where: { id: sale.id },
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
  ) {
    const productIds = items
      .map((item) => item.productId)
      .filter((productId): productId is string => Boolean(productId));
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { organizationId, id: { in: productIds } },
        })
      : [];

    if (products.length !== new Set(productIds).size) {
      throw new NotFoundException('One or more sale products were not found');
    }

    return items.map((item) => {
      const product = item.productId
        ? products.find((entry) => entry.id === item.productId)
        : undefined;
      const unitPrice = product
        ? Number(product.price)
        : item.unitPrice ?? 0;
      const productName = product?.name ?? item.productName;
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
        productName,
        sku: product?.sku ?? item.sku,
        quantity: item.quantity,
        unitPrice,
        unitCost: product ? Number(product.cost) : undefined,
        total: unitPrice * item.quantity,
        trackStock: product?.trackStock ?? false,
      };
    });
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
      checks.push(
        this.prisma.member.findFirst({
          where: { id: dto.memberId, organizationId },
          select: { id: true },
        }),
      );
    }
    const results = await Promise.all(checks);
    if (results.some((result) => !result)) {
      throw new NotFoundException('Related sale entity not found');
    }
  }

  private saleInclude() {
    return {
      gym: true,
      member: true,
      seller: { select: { id: true, name: true, email: true } },
      items: { include: { product: true } },
      payments: true,
    };
  }
}
