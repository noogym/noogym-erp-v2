import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.PlanWhereInput = {
      organizationId,
      ...(query.search
        ? { name: { contains: query.search } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.plan.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  create(organizationId: string, dto: CreatePlanDto) {
    return this.prisma.plan.create({ data: { ...dto, organizationId } });
  }

  async update(organizationId: string, id: string, dto: UpdatePlanDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.plan.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.plan.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.plan.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Plan not found');
    }
  }
}
