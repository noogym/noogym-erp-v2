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
import { AddWorkoutExerciseDto } from './dto/add-workout-exercise.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { WorkoutsService } from './workouts.service';

@ApiTags('Workouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    return this.workoutsService.findAll(user.organizationId, query);
  }

  @Post()
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.SUPER_ADMIN,
  )
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkoutDto) {
    return this.workoutsService.create(user.organizationId, user.sub, dto);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workoutsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.SUPER_ADMIN,
  )
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWorkoutDto,
  ) {
    return this.workoutsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.MANAGER, UserRole.SUPER_ADMIN)
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.workoutsService.remove(user.organizationId, id);
  }

  @Post(':id/exercises')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.SUPER_ADMIN,
  )
  addExercise(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AddWorkoutExerciseDto,
  ) {
    return this.workoutsService.addExercise(user.organizationId, id, dto);
  }

  @Post(':id/assign-member')
  @Roles(
    UserRole.OWNER,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.TRAINER,
    UserRole.SUPER_ADMIN,
  )
  assignMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignMemberDto,
  ) {
    return this.workoutsService.assignMember(user.organizationId, id, dto);
  }
}
