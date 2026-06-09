import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PlanStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanCategoryDto } from './dto/create-plan-category.dto';
import { UpdatePlanCategoryDto } from './dto/update-plan-category.dto';

@Injectable()
export class PlanCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.PlanCategoryWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as PlanStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { description: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.planCategory.findMany({
        where,
        skip,
        take,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.planCategory.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreatePlanCategoryDto) {
    const name = dto.name.trim();
    if (!name) throw new BadRequestException('Plan category name is required');
    await this.ensureUniqueName(organizationId, name);

    return this.prisma.planCategory.create({
      data: {
        ...dto,
        name,
        icon: dto.icon?.trim() || name,
        color: dto.color ?? '#B6FF00',
        organizationId,
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    dto: UpdatePlanCategoryDto,
  ) {
    const current = await this.ensureExists(organizationId, id);
    const name = dto.name?.trim();
    if (dto.name !== undefined && !name) {
      throw new BadRequestException('Plan category name is required');
    }
    if (name && name.toLowerCase() !== current.name.toLowerCase()) {
      await this.ensureUniqueName(organizationId, name, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const category = await tx.planCategory.update({
        where: { id },
        data: {
          ...dto,
          ...(name ? { name } : {}),
          ...(dto.icon !== undefined ? { icon: dto.icon?.trim() || name } : {}),
        },
      });

      if (name && name !== current.name) {
        await tx.plan.updateMany({
          where: { organizationId, category: current.name },
          data: { category: name },
        });
      }

      return category;
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.planCategory.update({
      where: { id },
      data: { status: PlanStatus.INACTIVE },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const category = await this.prisma.planCategory.findFirst({
      where: { id, organizationId },
    });

    if (!category) {
      throw new NotFoundException('Plan category not found');
    }

    return category;
  }

  private async ensureUniqueName(
    organizationId: string,
    name: string,
    currentId?: string,
  ) {
    const existing = await this.prisma.planCategory.findFirst({
      where: {
        organizationId,
        name,
        ...(currentId ? { id: { not: currentId } } : {}),
      },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Plan category already exists');
    }
  }
}
