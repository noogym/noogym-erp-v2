import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('overview')
  overview(@CurrentUser() user: AuthUser) {
    return this.reportsService.overview(user.organizationId);
  }

  @Get('financial')
  financial(@CurrentUser() user: AuthUser) {
    return this.reportsService.financial(user.organizationId);
  }

  @Get('members')
  members(@CurrentUser() user: AuthUser) {
    return this.reportsService.members(user.organizationId);
  }

  @Get('workouts')
  workouts(@CurrentUser() user: AuthUser) {
    return this.reportsService.workouts(user.organizationId);
  }

  @Get('checkins')
  checkins(@CurrentUser() user: AuthUser) {
    return this.reportsService.checkins(user.organizationId);
  }

  @Get('sales')
  sales(@CurrentUser() user: AuthUser) {
    return this.reportsService.sales(user.organizationId);
  }

  @Get('products')
  products(@CurrentUser() user: AuthUser) {
    return this.reportsService.products(user.organizationId);
  }

  @Get('classes')
  classes(@CurrentUser() user: AuthUser) {
    return this.reportsService.classes(user.organizationId);
  }

  @Get('employees')
  employees(@CurrentUser() user: AuthUser) {
    return this.reportsService.employees(user.organizationId);
  }
}
