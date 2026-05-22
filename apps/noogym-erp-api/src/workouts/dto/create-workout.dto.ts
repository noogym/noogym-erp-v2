import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutLevel, WorkoutStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkoutDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  goal?: string;

  @ApiPropertyOptional({ enum: WorkoutLevel })
  @IsOptional()
  @IsEnum(WorkoutLevel)
  level?: WorkoutLevel;

  @ApiPropertyOptional({ enum: WorkoutStatus })
  @IsOptional()
  @IsEnum(WorkoutStatus)
  status?: WorkoutStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
