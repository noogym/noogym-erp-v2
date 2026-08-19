import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma, UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../decorators/current-user.decorator';
import { Roles } from '../decorators/roles.decorator';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { BackgroundJobsService } from './background-jobs.service';
import { CreateBackgroundJobDto } from './dto/create-background-job.dto';

@ApiTags('Background Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('background-jobs')
export class BackgroundJobsController {
  constructor(private readonly backgroundJobs: BackgroundJobsService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.backgroundJobs.findAll(user.organizationId, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  enqueue(@CurrentUser() user: AuthUser, @Body() dto: CreateBackgroundJobDto) {
    const payload = {
      ...(dto.payload ?? {}),
      organizationId: user.organizationId,
    } as Prisma.InputJsonObject;

    return this.backgroundJobs.enqueue({
      delayMs: dto.delayMs,
      dedupeKey: dto.dedupeKey,
      maxAttempts: dto.maxAttempts,
      name: dto.name,
      organizationId: user.organizationId,
      payload,
      referenceId: dto.referenceId,
    });
  }
}
