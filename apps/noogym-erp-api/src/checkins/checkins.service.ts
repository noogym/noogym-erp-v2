import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';

@Injectable()
export class CheckinsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.CheckInWhereInput = {
      organizationId,
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.startDate || query.endDate
        ? {
            checkedAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? { member: { name: { contains: query.search } } }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.checkIn.findMany({
        where,
        skip,
        take,
        orderBy: { checkedAt: 'desc' },
        include: { member: true, gym: true },
      }),
      this.prisma.checkIn.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async today(organizationId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.checkIn.findMany({
      where: { organizationId, checkedAt: { gte: start, lt: end } },
      orderBy: { checkedAt: 'desc' },
      include: { member: true, gym: true },
    });
  }

  async create(organizationId: string, dto: CreateCheckinDto) {
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (member.status !== MemberStatus.ACTIVE) {
      throw new BadRequestException('Member is not active');
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        memberId: dto.memberId,
        status: SubscriptionStatus.ACTIVE,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        'Member does not have a valid active subscription',
      );
    }

    return this.prisma.checkIn.create({
      data: {
        organizationId,
        memberId: dto.memberId,
        gymId: dto.gymId ?? member.gymId,
        method: dto.method,
        notes: dto.notes,
      },
      include: { member: true, gym: true },
    });
  }
}
