import { ApiPropertyOptional } from '@nestjs/swagger';
import { PlanStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsBoolean,
  IsEnum,
  IsInt,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiPropertyOptional({ enum: PlanStatus })
  @IsOptional()
  @IsEnum(PlanStatus)
  status?: PlanStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxCheckIns?: number;

  @IsOptional()
  @IsBoolean()
  includesClasses?: boolean;

  @IsOptional()
  @IsBoolean()
  includesWorkouts?: boolean;

  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  gymIds?: string[];
}
