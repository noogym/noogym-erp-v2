import { Injectable, NotFoundException } from '@nestjs/common';
import { MemberStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.MemberWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as MemberStatus } : {}),
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { email: { contains: query.search } },
              { phone: { contains: query.search } },
              {
                documentNumber: { contains: query.search },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          gym: true,
          subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const member = await this.prisma.member.findFirst({
      where: { id, organizationId },
      include: {
        gym: true,
        subscriptions: { include: { plan: true, payments: true } },
        payments: true,
        checkIns: { orderBy: { checkedAt: 'desc' }, take: 20 },
        workoutAssignments: { include: { workout: true } },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  create(organizationId: string, dto: CreateMemberDto) {
    return this.prisma.member.create({
      data: {
        ...dto,
        organizationId,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateMemberDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.member.update({
      where: { id },
      data: dto,
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.member.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.member.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Member not found');
    }
  }
}
