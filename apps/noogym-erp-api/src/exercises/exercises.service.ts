import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.ExerciseWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { equipment: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.exercise.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { muscleGroup: true },
      }),
      this.prisma.exercise.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  create(organizationId: string, dto: CreateExerciseDto) {
    return this.prisma.exercise.create({
      data: { ...dto, organizationId },
      include: { muscleGroup: true },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateExerciseDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.exercise.update({
      where: { id },
      data: dto,
      include: { muscleGroup: true },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.exercise.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.exercise.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Exercise not found');
    }
  }
}
