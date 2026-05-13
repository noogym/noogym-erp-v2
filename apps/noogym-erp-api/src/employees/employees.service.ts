import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmployeeStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.EmployeeWhereInput = {
      organizationId,
      ...(query.gymId ? { gymId: query.gymId } : {}),
      ...(query.status ? { status: query.status as EmployeeStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { role: { contains: query.search, mode: 'insensitive' } },
              { department: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: this.employeeInclude(),
      }),
      this.prisma.employee.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const employee = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      include: this.employeeInclude(),
    });
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async create(organizationId: string, dto: CreateEmployeeDto) {
    await this.validateRelations(organizationId, dto);

    return this.prisma.employee.create({
      data: { ...dto, organizationId },
      include: this.employeeInclude(),
    });
  }

  async update(organizationId: string, id: string, dto: UpdateEmployeeDto) {
    await this.ensureExists(organizationId, id);
    await this.validateRelations(organizationId, dto, id);

    return this.prisma.employee.update({
      where: { id },
      data: dto,
      include: this.employeeInclude(),
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);

    return this.prisma.employee.update({
      where: { id },
      data: { status: EmployeeStatus.INACTIVE },
      include: this.employeeInclude(),
    });
  }

  private async validateRelations(
    organizationId: string,
    dto: Partial<CreateEmployeeDto>,
    currentId?: string,
  ) {
    if (dto.gymId) {
      const gym = await this.prisma.gym.findFirst({
        where: { id: dto.gymId, organizationId },
        select: { id: true },
      });
      if (!gym) throw new NotFoundException('Gym not found');
    }

    if (dto.userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: dto.userId, organizationId },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('User not found');

      const linked = await this.prisma.employee.findFirst({
        where: {
          userId: dto.userId,
          ...(currentId ? { id: { not: currentId } } : {}),
        },
        select: { id: true },
      });
      if (linked)
        throw new BadRequestException('User already has employee profile');
    }
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.employee.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Employee not found');
  }

  private employeeInclude() {
    return {
      gym: true,
      user: {
        select: { id: true, name: true, email: true, role: true, status: true },
      },
      _count: { select: { classes: true } },
    };
  }
}
