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
import {
  CreateClassEnrollmentDto,
  UpdateClassEnrollmentDto,
} from './dto/class-enrollment.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesService } from './classes.service';

@ApiTags('Classes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.classesService.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classesService.findOne(user.organizationId, id);
  }

  @Post()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClassDto) {
    return this.classesService.create(user.organizationId, dto);
  }

  @Patch(':id')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classesService.update(user.organizationId, id, dto);
  }

  @Post(':id/enrollments')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  enroll(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateClassEnrollmentDto,
  ) {
    return this.classesService.enroll(user.organizationId, id, dto);
  }

  @Patch(':id/enrollments/:memberId')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.RECEPTIONIST,
    UserRole.SUPER_ADMIN,
  )
  updateEnrollment(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateClassEnrollmentDto,
  ) {
    return this.classesService.updateEnrollment(
      user.organizationId,
      id,
      memberId,
      dto,
    );
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.classesService.remove(user.organizationId, id);
  }
}
