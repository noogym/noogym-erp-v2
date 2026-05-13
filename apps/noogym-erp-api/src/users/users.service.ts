import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.UserWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as UserStatus } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          lastLoginAt: true,
          createdAt: true,
          gyms: { include: { gym: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        gyms: { include: { gym: true } },
      },
    });

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(organizationId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new BadRequestException('Email already registered');
    await this.ensureGyms(organizationId, dto.gymIds ?? []);

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    return this.prisma.user.create({
      data: {
        organizationId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        role: dto.role ?? 'ADMIN',
        status: dto.status ?? 'INVITED',
        avatarUrl: dto.avatarUrl,
        gyms: dto.gymIds?.length
          ? { create: dto.gymIds.map((gymId) => ({ gymId })) }
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        gyms: { include: { gym: true } },
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateUserDto) {
    await this.ensureExists(organizationId, id);
    await this.ensureGyms(organizationId, dto.gymIds ?? []);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Email already registered');
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    return this.prisma.$transaction(async (tx) => {
      if (dto.gymIds) {
        await tx.userGym.deleteMany({ where: { userId: id } });
        if (dto.gymIds.length) {
          await tx.userGym.createMany({
            data: dto.gymIds.map((gymId) => ({ userId: id, gymId })),
          });
        }
      }

      return tx.user.update({
        where: { id },
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: dto.role,
          status: dto.status,
          avatarUrl: dto.avatarUrl,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          avatarUrl: true,
          gyms: { include: { gym: true } },
        },
      });
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, name: true, email: true, status: true },
    });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.user.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('User not found');
  }

  private async ensureGyms(organizationId: string, gymIds: string[]) {
    if (!gymIds.length) return;
    const uniqueGymIds = [...new Set(gymIds)];
    if (uniqueGymIds.length !== gymIds.length) {
      throw new BadRequestException('Gym list has duplicates');
    }
    const count = await this.prisma.gym.count({
      where: { organizationId, id: { in: uniqueGymIds } },
    });
    if (count !== uniqueGymIds.length) {
      throw new NotFoundException('One or more gyms were not found');
    }
  }
}
