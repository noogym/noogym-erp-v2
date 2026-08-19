import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EmailQueueService } from '../common/email/email-queue.service';
import { EmailTemplateService } from '../common/email/email-template.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { memberGymScope } from '../common/utils/gym-scope';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { ScheduleMessageDto } from './dto/schedule-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const memberScope = memberGymScope(query);
    const where: Prisma.MessageWhereInput = {
      organizationId,
      ...(Object.keys(memberScope).length
        ? { recipients: { some: { member: memberScope } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search } },
              { content: { contains: query.search } },
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
    const message = await this.ensureMessage(organizationId, id);

    if (message.channel === 'EMAIL') {
      return this.sendEmailMessage(message);
    }

    return this.prisma.message.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
      include: { recipients: { include: { member: true } } },
    });
  }

  private async sendEmailMessage(
    message: Prisma.MessageGetPayload<{
      include: {
        recipients: {
          include: {
            member: { select: { email: true; id: true; name: true } };
          };
        };
      };
    }>,
  ) {
    const recipients = message.recipients.filter((recipient) =>
      this.isValidEmail(recipient.member.email),
    );

    if (!recipients.length) {
      return this.markMessageFailed(message.id);
    }

    const results = await Promise.all(
      recipients.map(async (recipient) => {
        const result = await this.emailQueue.queueEmail({
          organizationId: message.organizationId,
          messageId: message.id,
          messageRecipientId: recipient.id,
          to: recipient.member.email as string,
          subject: message.title?.trim() || 'Mensagem Noogym',
          text: message.content,
          html: this.emailTemplate.render({
            eyebrow: 'Comunicado',
            greeting: `Ola, ${recipient.member.name}`,
            intro: [message.content],
            preheader: message.content.slice(0, 140),
            title: message.title?.trim() || 'Mensagem Noogym',
          }),
        });

        return {
          queued: result.queued,
          sent: result.sent,
        };
      }),
    );

    const acceptedCount = results.filter(
      (result) => result.sent || result.queued,
    ).length;

    if (!acceptedCount) {
      return this.markMessageFailed(message.id);
    }

    return this.prisma.message.update({
      where: { id: message.id },
      data: {
        status: results.some((result) => result.sent) ? 'SENT' : 'SCHEDULED',
        sentAt: results.some((result) => result.sent) ? new Date() : null,
      },
      include: { recipients: { include: { member: true } } },
    });
  }

  private async ensureMembers(organizationId: string, memberIds: string[]) {
    const uniqueMemberIds = [...new Set(memberIds)];
    if (uniqueMemberIds.length !== memberIds.length) {
      throw new BadRequestException('Message recipient list has duplicates');
    }

    const members = await this.prisma.member.findMany({
      where: { organizationId, id: { in: uniqueMemberIds } },
      select: { id: true, status: true },
    });

    if (members.length !== uniqueMemberIds.length) {
      throw new NotFoundException('One or more recipients were not found');
    }

    members.forEach(assertActiveMember);
  }

  private async ensureMessage(organizationId: string, id: string) {
    const message = await this.prisma.message.findFirst({
      where: { id, organizationId },
      include: {
        recipients: {
          include: {
            member: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  private markMessageFailed(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { status: 'FAILED', sentAt: null },
      include: { recipients: { include: { member: true } } },
    });
  }

  private isValidEmail(value?: string | null) {
    return Boolean(value?.trim().includes('@'));
  }
}
