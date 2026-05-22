import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.ExpenseWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status as PaymentStatus } : {}),
      ...(query.method ? { method: query.method as PaymentMethod } : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { category: { contains: query.search } },
              { description: { contains: query.search } },
              { supplier: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  create(organizationId: string, dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        ...dto,
        organizationId,
        paidAt: dto.status === 'PAID' ? dto.paidAt ?? new Date() : dto.paidAt,
      },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateExpenseDto) {
    await this.ensureExists(organizationId, id);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        paidAt: dto.status === 'PAID' ? dto.paidAt ?? new Date() : dto.paidAt,
      },
    });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureExists(organizationId, id);
    return this.prisma.expense.delete({ where: { id } });
  }

  private async ensureExists(organizationId: string, id: string) {
    const exists = await this.prisma.expense.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Expense not found');
    }
  }
}
