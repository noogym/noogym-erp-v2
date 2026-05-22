import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  overview(@CurrentUser() user: AuthUser) {
    return this.reportsService.overview(user.organizationId);
  }

  @Get('financial')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  financial(@CurrentUser() user: AuthUser) {
    return this.reportsService.financial(user.organizationId);
  }

  @Get('members')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  members(@CurrentUser() user: AuthUser) {
    return this.reportsService.members(user.organizationId);
  }

  @Get('workouts')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.SUPER_ADMIN,
  )
  workouts(@CurrentUser() user: AuthUser) {
    return this.reportsService.workouts(user.organizationId);
  }

  @Get('checkins')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  checkins(@CurrentUser() user: AuthUser) {
    return this.reportsService.checkins(user.organizationId);
  }

  @Get('sales')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  sales(@CurrentUser() user: AuthUser) {
    return this.reportsService.sales(user.organizationId);
  }

  @Get('products')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  products(@CurrentUser() user: AuthUser) {
    return this.reportsService.products(user.organizationId);
  }

  @Get('classes')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  classes(@CurrentUser() user: AuthUser) {
    return this.reportsService.classes(user.organizationId);
  }

  @Get('employees')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  employees(@CurrentUser() user: AuthUser) {
    return this.reportsService.employees(user.organizationId);
  }
}
