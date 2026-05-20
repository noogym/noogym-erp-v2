import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.IntegrationWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { provider: { contains: query.search } },
              { name: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.integration.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.integration.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreateIntegrationDto) {
    const exists = await this.prisma.integration.findUnique({
      where: {
        organizationId_provider: { organizationId, provider: dto.provider },
      },
      select: { id: true },
    });
    if (exists)
      throw new BadRequestException('Integration provider already exists');

    return this.prisma.integration.create({
      data: {
        organizationId,
        provider: dto.provider,
        name: dto.name,
        isActive: dto.isActive ?? false,
        config: dto.config as Prisma.InputJsonValue,
        connectedAt: dto.isActive ? new Date() : undefined,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateIntegrationDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.integration.update({
      where: { id },
      data: {
        provider: dto.provider,
        name: dto.name,
        isActive: dto.isActive,
        config: dto.config as Prisma.InputJsonValue,
        connectedAt: dto.isActive ? new Date() : undefined,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.integration.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.integration.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Integration not found');
  }
}
