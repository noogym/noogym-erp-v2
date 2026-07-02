import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
          subscriptions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { plan: true },
          },
          checkIns: { orderBy: { checkedAt: 'desc' }, take: 1 },
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

  async create(organizationId: string, dto: CreateMemberDto) {
    await this.ensureGym(organizationId, dto.gymId);
    const data = this.cleanMemberData(dto);
    await this.ensureUniqueIdentity(organizationId, data);

    return this.prisma.member.create({
      data: {
        ...data,
        organizationId,
      } as Prisma.MemberUncheckedCreateInput,
      include: {
        gym: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateMemberDto) {
    await this.ensureExists(organizationId, id);
    await this.ensureGym(organizationId, dto.gymId);
    const data = this.cleanMemberData(dto);
    await this.ensureUniqueIdentity(organizationId, data, id);

    return this.prisma.member.update({
      where: { id },
      data,
      include: {
        gym: true,
        subscriptions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
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

  private async ensureGym(organizationId: string, gymId?: string) {
    if (!gymId) return;

    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId },
      select: { id: true },
    });

    if (!gym) {
      throw new NotFoundException('Gym not found');
    }
  }

  private cleanMemberData(dto: CreateMemberDto | UpdateMemberDto) {
    return {
      ...dto,
      ...(dto.email !== undefined
        ? { email: dto.email.trim().toLowerCase() || undefined }
        : {}),
      ...(dto.phone !== undefined
        ? { phone: dto.phone.trim() || undefined }
        : {}),
      ...(dto.documentNumber !== undefined
        ? { documentNumber: dto.documentNumber.trim() || undefined }
        : {}),
    };
  }

  private async ensureUniqueIdentity(
    organizationId: string,
    dto: CreateMemberDto | UpdateMemberDto,
    currentId?: string,
  ) {
    const email = this.normalizeEmail(dto.email);
    const phone = this.normalizeDigits(dto.phone);
    const documentNumber = this.normalizeDocument(dto.documentNumber);

    if (!email && !phone && !documentNumber) return;

    const candidates = await this.prisma.member.findMany({
      where: {
        organizationId,
        ...(currentId ? { id: { not: currentId } } : {}),
        OR: [
          ...(email ? [{ email: { not: null } }] : []),
          ...(phone ? [{ phone: { not: null } }] : []),
          ...(documentNumber ? [{ documentNumber: { not: null } }] : []),
        ],
      },
      select: {
        id: true,
        email: true,
        phone: true,
        documentNumber: true,
      },
    });

    const duplicate = candidates.find(
      (member) =>
        (email && this.normalizeEmail(member.email) === email) ||
        (phone && this.normalizeDigits(member.phone) === phone) ||
        (documentNumber &&
          this.normalizeDocument(member.documentNumber) === documentNumber),
    );

    if (duplicate) {
      throw new ConflictException({
        message:
          'Ja existe cliente cadastrado com este e-mail, telefone ou BI.',
        code: 'MEMBER_DUPLICATE_IDENTITY',
      });
    }
  }

  private normalizeEmail(value?: string | null) {
    return value?.trim().toLowerCase() ?? '';
  }

  private normalizeDigits(value?: string | null) {
    return value?.replace(/\D/g, '') ?? '';
  }

  private normalizeDocument(value?: string | null) {
    return value?.replace(/[^a-z0-9]/gi, '').toUpperCase() ?? '';
  }
}
