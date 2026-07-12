import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { gymIdScope } from '../common/utils/gym-scope';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGymDto } from './dto/create-gym.dto';
import { UpdateGymDto } from './dto/update-gym.dto';

@Injectable()
export class GymsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.GymWhereInput = {
      organizationId,
      ...gymIdScope(query),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { slug: { contains: query.search } },
              { city: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.gym.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { members: true, users: true, appointments: true },
          },
        },
      }),
      this.prisma.gym.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const gym = await this.prisma.gym.findFirst({
      where: { id, organizationId },
      include: {
        rooms: true,
        _count: { select: { members: true, users: true } },
      },
    });
    if (!gym) throw new NotFoundException('Gym not found');
    return gym;
  }

  async create(organizationId: string, dto: CreateGymDto) {
    await this.ensureUniqueSlug(organizationId, dto.slug);
    return this.prisma.gym.create({ data: { ...dto, organizationId } });
  }

  async update(organizationId: string, id: string, dto: UpdateGymDto) {
    await this.ensureExists(organizationId, id);
    if (dto.slug) await this.ensureUniqueSlug(organizationId, dto.slug, id);
    return this.prisma.gym.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.gym.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.gym.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Gym not found');
  }

  private async ensureUniqueSlug(
    organizationId: string,
    slug: string,
    ignoreId?: string,
  ) {
    const exists = await this.prisma.gym.findFirst({
      where: {
        organizationId,
        slug,
        ...(ignoreId ? { id: { not: ignoreId } } : {}),
      },
      select: { id: true },
    });
    if (exists) throw new BadRequestException('Gym slug already exists');
  }
}
