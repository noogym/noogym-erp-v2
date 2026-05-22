import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { WebAdminEntrypointService } from './web-admin-entrypoint.service';

@ApiTags('Entrypoints - Web Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entrypoints/web-admin')
export class WebAdminEntrypointController {
  constructor(
    private readonly webAdminEntrypointService: WebAdminEntrypointService,
  ) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: AuthUser) {
    return this.webAdminEntrypointService.dashboard(user.organizationId);
  }
}
