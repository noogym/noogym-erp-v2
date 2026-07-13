import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSupportSessionDto } from './dto/create-support-session.dto';
import { SuperAdminService } from './super-admin.service';

@ApiTags('Super Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('overview')
  overview() {
    return this.superAdminService.overview();
  }

  @Post('users/:id/password-reset')
  sendPasswordReset(@Param('id') id: string) {
    return this.superAdminService.sendPasswordReset(id);
  }

  @Post('support-sessions')
  createSupportSession(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSupportSessionDto,
  ) {
    return this.superAdminService.createSupportSession(user, dto);
  }

  @Post('support-sessions/end')
  endSupportSession(@CurrentUser() user: AuthUser) {
    return this.superAdminService.endSupportSession(user);
  }
}
