import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateOperationalSettingsDto } from './dto/update-operational-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('operational')
  getOperational(@CurrentUser() user: AuthUser) {
    return this.settingsService.getOperational(user.organizationId);
  }

  @Patch('operational')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateOperational(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOperationalSettingsDto,
  ) {
    return this.settingsService.updateOperational(
      user.organizationId,
      dto.settings,
    );
  }

  @Delete('operational')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  resetOperational(@CurrentUser() user: AuthUser) {
    return this.settingsService.resetOperational(user.organizationId);
  }
}
