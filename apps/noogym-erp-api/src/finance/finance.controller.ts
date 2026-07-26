import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CloseCashSessionDto } from './dto/close-cash-session.dto';
import { CreateFinanceAccountDto } from './dto/create-finance-account.dto';
import { CreateFinanceCategoryDto } from './dto/create-finance-category.dto';
import { OpenCashSessionDto } from './dto/open-cash-session.dto';
import { UpdateFinanceAccountDto } from './dto/update-finance-account.dto';
import { UpdateFinanceCategoryDto } from './dto/update-finance-category.dto';
import { FinanceService } from './finance.service';

const financeRoles = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.FINANCE,
  UserRole.SUPER_ADMIN,
];
const cashSessionRoles = [...financeRoles, UserRole.RECEPTIONIST];

@ApiTags('Finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('summary')
  @Roles(...financeRoles)
  summary(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.financeService.summary(user.organizationId, query);
  }

  @Get('accounts')
  @Roles(...financeRoles)
  accounts(@CurrentUser() user: AuthUser) {
    return this.financeService.listAccounts(user.organizationId);
  }

  @Post('accounts')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  createAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFinanceAccountDto,
  ) {
    return this.financeService.createAccount(user.organizationId, dto);
  }

  @Patch('accounts/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  updateAccount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceAccountDto,
  ) {
    return this.financeService.updateAccount(user.organizationId, id, dto);
  }

  @Get('categories')
  @Roles(...financeRoles)
  categories(@CurrentUser() user: AuthUser, @Query('kind') kind?: string) {
    return this.financeService.listCategories(user.organizationId, kind);
  }

  @Post('categories')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  createCategory(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFinanceCategoryDto,
  ) {
    return this.financeService.createCategory(user.organizationId, dto);
  }

  @Patch('categories/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  updateCategory(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateFinanceCategoryDto,
  ) {
    return this.financeService.updateCategory(user.organizationId, id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.FINANCE, UserRole.SUPER_ADMIN)
  removeCategory(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.financeService.removeCategory(user.organizationId, id);
  }

  @Get('cash-sessions')
  @Roles(...cashSessionRoles)
  cashSessions(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.financeService.listCashSessions(user.organizationId, query);
  }

  @Get('cash-sessions/current')
  @Roles(...cashSessionRoles)
  currentCashSession(
    @CurrentUser() user: AuthUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.financeService.currentCashSession(user.organizationId, query);
  }

  @Post('cash-sessions/open')
  @Roles(...cashSessionRoles)
  openCashSession(
    @CurrentUser() user: AuthUser,
    @Body() dto: OpenCashSessionDto,
  ) {
    return this.financeService.openCashSession(
      user.organizationId,
      user.sub,
      dto,
    );
  }

  @Post('cash-sessions/:id/close')
  @Roles(...cashSessionRoles)
  closeCashSession(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CloseCashSessionDto,
  ) {
    return this.financeService.closeCashSession(
      user.organizationId,
      user.sub,
      id,
      dto,
    );
  }
}
