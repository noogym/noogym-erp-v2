import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { getPagination, paginated } from '../common/utils/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { AddWorkoutExerciseDto } from './dto/add-workout-exercise.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.WorkoutWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { goal: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.workout.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { exercises: true, assignments: true } },
        },
      }),
      this.prisma.workout.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async findOne(organizationId: string, id: string) {
    const workout = await this.prisma.workout.findFirst({
      where: { id, organizationId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        exercises: {
          orderBy: { order: 'asc' },
          include: { exercise: { include: { muscleGroup: true } } },
        },
        assignments: { include: { member: true } },
      },
    });

    if (!workout) {
      throw new NotFoundException('Workout not found');
    }

    return workout;
  }

  create(organizationId: string, createdById: string, dto: CreateWorkoutDto) {
    return this.prisma.workout.create({
      data: { ...dto, organizationId, createdById },
    });
  }

  async update(organizationId: string, id: string, dto: UpdateWorkoutDto) {
    await this.ensureWorkout(organizationId, id);

    return this.prisma.workout.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, id: string) {
    await this.ensureWorkout(organizationId, id);
    return this.prisma.workout.delete({ where: { id } });
  }

  async addExercise(
    organizationId: string,
    id: string,
    dto: AddWorkoutExerciseDto,
  ) {
    await this.ensureWorkout(organizationId, id);
    const exercise = await this.prisma.exercise.findFirst({
      where: { id: dto.exerciseId, organizationId },
      select: { id: true },
    });

    if (!exercise) {
      throw new NotFoundException('Exercise not found');
    }

    try {
      return await this.prisma.workoutExercise.create({
        data: { ...dto, workoutId: id },
        include: { exercise: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('Workout exercise order already exists');
      }
      throw error;
    }
  }

  async assignMember(organizationId: string, id: string, dto: AssignMemberDto) {
    await this.ensureWorkout(organizationId, id);
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.workoutAssignment.create({
      data: {
        workoutId: id,
        memberId: dto.memberId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        isActive: dto.isActive ?? true,
      },
      include: { member: true, workout: true },
    });
  }

  private async ensureWorkout(organizationId: string, id: string) {
    const exists = await this.prisma.workout.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException('Workout not found');
    }
  }
}
