import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DesktopSyncQueryDto } from './dto/desktop-sync-query.dto';
import { DesktopSyncService } from './desktop-sync.service';

@ApiTags('Entrypoints - Desktop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('entrypoints/desktop')
export class DesktopSyncController {
  constructor(private readonly desktopSyncService: DesktopSyncService) {}

  @Get('sync/bootstrap')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  bootstrap(
    @CurrentUser() user: AuthUser,
    @Query() query: DesktopSyncQueryDto,
  ) {
    return this.desktopSyncService.bootstrap(user.organizationId, query);
  }
}
