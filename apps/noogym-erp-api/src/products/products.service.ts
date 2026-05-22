import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus, StockMovementType } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.ProductWhereInput = {
      organizationId,
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.status ? { status: query.status as ProductStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { category: { contains: query.search } },
              { sku: { contains: query.search } },
              { barcode: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { gym: true },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
      include: {
        gym: true,
        stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(organizationId: string, dto: CreateProductDto) {
    await this.ensureGym(organizationId, dto.gymId);
    await this.ensureUniqueCode(organizationId, dto.sku, dto.barcode);

    return this.prisma.product.create({
      data: { ...dto, organizationId },
      include: { gym: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateProductDto) {
    await this.ensureExists(organizationId, id);
    await this.ensureGym(organizationId, dto.gymId);
    await this.ensureUniqueCode(organizationId, dto.sku, dto.barcode, id);

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: { gym: true },
    });
  }

  async adjustStock(organizationId: string, id: string, dto: AdjustStockDto) {
    const product = await this.prisma.product.findFirst({
      where: { id, organizationId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const nextStock =
      dto.type === StockMovementType.ADJUSTMENT
        ? dto.quantity
        : product.stock + this.getStockDelta(dto.type, dto.quantity);
    if (nextStock < 0) {
      throw new BadRequestException('Product stock cannot be negative');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.stockMovement.create({
        data: {
          organizationId,
          productId: id,
          type: dto.type,
          quantity: dto.quantity,
          reason: dto.reason,
          reference: dto.reference,
        },
      });

      return tx.product.update({
        where: { id },
        data: { stock: nextStock },
        include: { gym: true },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.INACTIVE },
      include: { gym: true },
    });
  }

  private getStockDelta(type: StockMovementType, quantity: number) {
    if (type === StockMovementType.IN || type === StockMovementType.RETURN) {
      return quantity;
    }
    if (type === StockMovementType.OUT || type === StockMovementType.SALE) {
      return -quantity;
    }
    return 0;
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.product.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Product not found');
  }

  private async ensureGym(organizationId: string, gymId?: string) {
    if (!gymId) return;
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId },
      select: { id: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');
  }

  private async ensureUniqueCode(
    organizationId: string,
    sku?: string,
    barcode?: string,
    currentId?: string,
  ) {
    if (!sku && !barcode) return;
    const existing = await this.prisma.product.findFirst({
      where: {
        organizationId,
        ...(currentId ? { id: { not: currentId } } : {}),
        OR: [...(sku ? [{ sku }] : []), ...(barcode ? [{ barcode }] : [])],
      },
      select: { id: true },
    });
    if (existing) throw new BadRequestException('Product code already exists');
  }
}
