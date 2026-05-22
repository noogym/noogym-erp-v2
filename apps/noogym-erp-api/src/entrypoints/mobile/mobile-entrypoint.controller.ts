import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthUser,
  CurrentUser,
} from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { MobileEntrypointService } from './mobile-entrypoint.service';

@ApiTags('Entrypoints - Mobile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entrypoints/mobile')
export class MobileEntrypointController {
  constructor(
    private readonly mobileEntrypointService: MobileEntrypointService,
  ) {}

  @Get('me/summary')
  meSummary(@CurrentUser() user: AuthUser) {
    return this.mobileEntrypointService.meSummary(
      user.sub,
      user.organizationId,
    );
  }
}
