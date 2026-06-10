import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SubscriptionStatus } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
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
    const checkedAt = dto.checkedAt ?? new Date();
    const checkedAtDayStart = new Date(checkedAt);
    checkedAtDayStart.setHours(0, 0, 0, 0);
    const checkedAtDayEnd = new Date(checkedAtDayStart);
    checkedAtDayEnd.setDate(checkedAtDayEnd.getDate() + 1);
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId },
    });

    if (!member) throw new NotFoundException('Member not found');
    assertActiveMember(member);

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        memberId: dto.memberId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: checkedAt },
        OR: [
          { startDate: { lte: checkedAt } },
          { startDate: { gte: checkedAtDayStart, lt: checkedAtDayEnd } },
        ],
      },
    });

    if (!activeSubscription) {
      throw new BadRequestException(
        'Member does not have a valid active subscription',
      );
    }

    if (dto.gymId) {
      const gym = await this.prisma.gym.findFirst({
        where: { id: dto.gymId, organizationId },
        select: { id: true },
      });

      if (!gym) {
        throw new NotFoundException('Gym not found');
      }
    }

    return this.prisma.checkIn.create({
      data: {
        organizationId,
        memberId: dto.memberId,
        gymId: dto.gymId ?? member.gymId,
        method: dto.method,
        checkedAt,
        notes: dto.notes,
      },
      include: { member: true, gym: true },
    });
  }
}
