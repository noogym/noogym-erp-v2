import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ClassEnrollmentStatus, GymClassStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateClassEnrollmentDto,
  UpdateClassEnrollmentDto,
} from './dto/class-enrollment.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.GymClassWhereInput = {
      organizationId,
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.status ? { status: query.status as GymClassStatus } : {}),
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
              { name: { contains: query.search } },
              { category: { contains: query.search } },
              { description: { contains: query.search } },
              {
                instructor: {
                  name: { contains: query.search },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.gymClass.findMany({
        where,
        skip,
        take,
        orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
        include: this.classInclude(),
      }),
      this.prisma.gymClass.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id, organizationId },
      include: {
        ...this.classInclude(),
        enrollments: {
          include: { member: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!gymClass) throw new NotFoundException('Class not found');
    return gymClass;
  }

  async create(organizationId: string, dto: CreateClassDto) {
    this.validateSchedule(dto);
    await this.validateRelations(organizationId, dto);

    return this.prisma.gymClass.create({
      data: { ...dto, organizationId },
      include: this.classInclude(),
    });
  }

  async update(organizationId: string, id: string, dto: UpdateClassDto) {
    await this.ensureExists(organizationId, id);
    this.validateSchedule(dto);
    await this.validateRelations(organizationId, dto);

    return this.prisma.gymClass.update({
      where: { id },
      data: dto,
      include: this.classInclude(),
    });
  }

  async enroll(
    organizationId: string,
    classId: string,
    dto: CreateClassEnrollmentDto,
  ) {
    const gymClass = await this.prisma.gymClass.findFirst({
      where: { id: classId, organizationId },
      include: { enrollments: true },
    });
    if (!gymClass) throw new NotFoundException('Class not found');

    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId },
      select: { id: true, status: true },
    });
    if (!member) throw new NotFoundException('Member not found');
    assertActiveMember(member);

    const activeEnrollments = gymClass.enrollments.filter(
      (enrollment) =>
        enrollment.status === ClassEnrollmentStatus.RESERVED ||
        enrollment.status === ClassEnrollmentStatus.PRESENT,
    ).length;
    const status =
      gymClass.capacity > 0 && activeEnrollments >= gymClass.capacity
        ? ClassEnrollmentStatus.WAITLISTED
        : ClassEnrollmentStatus.RESERVED;

    if (
      status === ClassEnrollmentStatus.WAITLISTED &&
      !gymClass.allowWaitlist
    ) {
      throw new BadRequestException('Class capacity is full');
    }

    return this.prisma.classEnrollment.create({
      data: { classId, memberId: dto.memberId, status },
      include: { member: true, gymClass: true },
    });
  }

  async updateEnrollment(
    organizationId: string,
    classId: string,
    memberId: string,
    dto: UpdateClassEnrollmentDto,
  ) {
    await this.ensureExists(organizationId, classId);
    const enrollment = await this.prisma.classEnrollment.findFirst({
      where: { classId, memberId },
      select: { id: true },
    });
    if (!enrollment) throw new NotFoundException('Class enrollment not found');

    const updated = await this.prisma.classEnrollment.update({
      where: { id: enrollment.id },
      data: {
        status: dto.status,
        checkedAt:
          dto.status === ClassEnrollmentStatus.PRESENT ? new Date() : undefined,
      },
      include: { member: true, gymClass: true },
    });
    await this.refreshParticipants(classId);
    return updated;
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.gymClass.update({
      where: { id },
      data: { status: GymClassStatus.CANCELLED },
      include: this.classInclude(),
    });
  }

  private validateSchedule(dto: Partial<CreateClassDto>) {
    if (dto.startAt && dto.endAt && dto.endAt <= dto.startAt) {
      throw new BadRequestException('Class endAt must be after startAt');
    }
    if (dto.capacity !== undefined && dto.participants !== undefined) {
      if (dto.capacity > 0 && dto.participants > dto.capacity) {
        throw new BadRequestException('Participants cannot exceed capacity');
      }
    }
  }

  private async validateRelations(
    organizationId: string,
    dto: Partial<CreateClassDto>,
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
    if (dto.roomId) {
      checks.push(
        this.prisma.room.findFirst({
          where: { id: dto.roomId, gym: { organizationId } },
          select: { id: true },
        }),
      );
    }
    if (dto.instructorId) {
      checks.push(
        this.prisma.employee.findFirst({
          where: { id: dto.instructorId, organizationId },
          select: { id: true },
        }),
      );
    }

    const results = await Promise.all(checks);
    if (results.some((result) => !result)) {
      throw new NotFoundException('Related class entity not found');
    }
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.gymClass.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Class not found');
  }

  private async refreshParticipants(classId: string) {
    const participants = await this.prisma.classEnrollment.count({
      where: { classId, status: ClassEnrollmentStatus.PRESENT },
    });
    await this.prisma.gymClass.update({
      where: { id: classId },
      data: { participants },
    });
  }

  private classInclude() {
    return {
      gym: true,
      room: true,
      instructor: true,
      _count: { select: { enrollments: true } },
    };
  }
}
