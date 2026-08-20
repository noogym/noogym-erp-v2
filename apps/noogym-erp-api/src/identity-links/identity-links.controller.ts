import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { LinkMemberIdentityDto } from './dto/link-member-identity.dto';
import { ResolveIdentityDto } from './dto/resolve-identity.dto';
import { SendInviteDto } from './dto/send-invite.dto';
import { IdentityLinksService } from './identity-links.service';

const staffRoles = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.RECEPTIONIST,
  UserRole.SUPER_ADMIN,
] as const;

@ApiTags('Identity Links')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('identity-links')
export class IdentityLinksController {
  constructor(private readonly identityLinksService: IdentityLinksService) {}

  @Post('resolve')
  @Roles(...staffRoles)
  resolve(@CurrentUser() user: AuthUser, @Body() dto: ResolveIdentityDto) {
    return this.identityLinksService.resolve(user.organizationId, dto);
  }

  @Post('members')
  @Roles(...staffRoles)
  linkMember(
    @CurrentUser() user: AuthUser,
    @Body() dto: LinkMemberIdentityDto,
  ) {
    return this.identityLinksService.linkMember(user.organizationId, dto);
  }

  @Post('members/:memberId/invite')
  @Roles(...staffRoles)
  inviteMember(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
    @Body() dto: SendInviteDto,
  ) {
    return this.identityLinksService.inviteMemberToApp(
      user.organizationId,
      memberId,
      dto,
    );
  }

  @Post('employees/:employeeId/invite')
  @Roles(...staffRoles)
  inviteEmployee(
    @CurrentUser() user: AuthUser,
    @Param('employeeId') employeeId: string,
    @Body() dto: SendInviteDto,
  ) {
    return this.identityLinksService.inviteEmployeeToAccount(
      user.organizationId,
      employeeId,
      dto,
    );
  }
}
