import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.AppointmentWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as AppointmentStatus } : {}),
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.startDate || query.endDate
        ? {
            startAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              {
                member: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        skip,
        take,
        orderBy: { startAt: 'asc' },
        include: {
          gym: true,
          room: true,
          member: true,
          professional: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async create(organizationId: string, dto: CreateAppointmentDto) {
    this.validateDates(dto.startAt, dto.endAt);
    await this.validateRelations(organizationId, dto);

    return this.prisma.appointment.create({
      data: { ...dto, organizationId },
      include: {
        gym: true,
        room: true,
        member: true,
        professional: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateAppointmentDto) {
    await this.ensureExists(organizationId, id);
    if (dto.startAt && dto.endAt) {
      this.validateDates(dto.startAt, dto.endAt);
    }
    await this.validateRelations(organizationId, dto);

    return this.prisma.appointment.update({
      where: { id },
      data: dto,
      include: {
        gym: true,
        room: true,
        member: true,
        professional: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.appointment.delete({ where: { id } });
  }

  private validateDates(startAt: Date, endAt: Date) {
    if (endAt <= startAt) {
      throw new BadRequestException('Appointment endAt must be after startAt');
    }
  }

  private async validateRelations(
    organizationId: string,
    dto: Partial<CreateAppointmentDto>,
  ) {
    const checks: Promise<unknown>[] = [];

    if (dto.gymId) {
      checks.push(
        this.prisma.gym.findFirst({
          where: { id: dto.gymId, organizationId },
          select: { id: true },
        }),
      );
    }
    if (dto.memberId) {
      checks.push(
        this.prisma.member.findFirst({
          where: { id: dto.memberId, organizationId },
          select: { id: true },
        }),
      );
    }
    if (dto.professionalId) {
      checks.push(
        this.prisma.user.findFirst({
          where: { id: dto.professionalId, organizationId },
          select: { id: true },
        }),
      );
    }

    const results = await Promise.all(checks);
    if (results.some((result) => !result)) {
      throw new NotFoundException('Related appointment entity not found');
    }
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.appointment.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Appointment not found');
    }
  }
}
