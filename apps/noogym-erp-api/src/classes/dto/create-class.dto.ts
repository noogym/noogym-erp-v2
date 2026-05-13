import { ApiPropertyOptional } from '@nestjs/swagger';
import { GymClassStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateClassDto {
  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  instructorId?: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  equipment?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  participants?: number;

  @ApiPropertyOptional({ enum: GymClassStatus })
  @IsOptional()
  @IsEnum(GymClassStatus)
  status?: GymClassStatus;

  @IsOptional()
  @IsBoolean()
  allowWaitlist?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresCheckIn?: boolean;

  @IsOptional()
  @IsString()
  color?: string;
}
