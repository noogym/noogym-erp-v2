import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ScheduleMessageDto } from './dto/schedule-message.dto';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.MessageWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { content: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { recipients: { include: { member: true } } },
      }),
      this.prisma.message.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreateMessageDto) {
    await this.ensureMembers(organizationId, dto.memberIds);

    return this.prisma.message.create({
      data: {
        organizationId,
        title: dto.title,
        content: dto.content,
        channel: dto.channel,
        status: dto.status ?? 'DRAFT',
        scheduledAt: dto.scheduledAt,
        recipients: {
          create: dto.memberIds.map((memberId) => ({ memberId })),
        },
      },
      include: { recipients: { include: { member: true } } },
    });
  }

  async schedule(organizationId: string, id: string, dto: ScheduleMessageDto) {
    await this.ensureMessage(organizationId, id);

    return this.prisma.message.update({
      where: { id },
      data: { status: 'SCHEDULED', scheduledAt: dto.scheduledAt },
    });
  }

  async send(organizationId: string, id: string) {
    await this.ensureMessage(organizationId, id);

    return this.prisma.message.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: { recipients: { include: { member: true } } },
    });
  }

  private async ensureMembers(organizationId: string, memberIds: string[]) {
    const uniqueMemberIds = [...new Set(memberIds)];
    if (uniqueMemberIds.length !== memberIds.length) {
      throw new BadRequestException('Message recipient list has duplicates');
    }

    const count = await this.prisma.member.count({
      where: { organizationId, id: { in: uniqueMemberIds } },
    });

    if (count !== uniqueMemberIds.length) {
      throw new NotFoundException('One or more recipients were not found');
    }
  }

  private async ensureMessage(organizationId: string, id: string) {
    const exists = await this.prisma.message.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Message not found');
    }
  }
}
