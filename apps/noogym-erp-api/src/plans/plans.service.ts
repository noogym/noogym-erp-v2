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
      ...(query.gymId
        ? {
            OR: [
              { gyms: { none: {} } },
              { gyms: { some: { gymId: query.gymId } } },
            ],
          }
        : {}),
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
        include: this.planInclude(),
      }),
      this.prisma.plan.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreatePlanDto) {
    const { gymIds, ...data } = dto;
    await this.ensureGyms(organizationId, gymIds ?? []);

    return this.prisma.plan.create({
      data: {
        ...data,
        organizationId,
        gyms: gymIds?.length
          ? { create: gymIds.map((gymId) => ({ gymId })) }
          : undefined,
      },
      include: this.planInclude(),
    });
  }

  async update(organizationId: string, id: string, dto: UpdatePlanDto) {
    await this.ensureExists(organizationId, id);
    const { gymIds, ...data } = dto;
    await this.ensureGyms(organizationId, gymIds ?? []);

    return this.prisma.$transaction(async (tx) => {
      if (gymIds) {
        await tx.planGym.deleteMany({ where: { planId: id } });
        if (gymIds.length) {
          await tx.planGym.createMany({
            data: gymIds.map((gymId) => ({ planId: id, gymId })),
          });
        }
      }

      return tx.plan.update({
        where: { id },
        data,
        include: this.planInclude(),
      });
    });
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

  private async ensureGyms(organizationId: string, gymIds: string[]) {
    if (!gymIds.length) return;
    const uniqueGymIds = [...new Set(gymIds)];
    const count = await this.prisma.gym.count({
      where: { organizationId, id: { in: uniqueGymIds } },
    });

    if (count !== uniqueGymIds.length) {
      throw new NotFoundException('One or more gyms were not found');
    }
  }

  private planInclude() {
    return {
      gyms: {
        include: { gym: true },
      },
    };
  }
}
