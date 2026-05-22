import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInMethod } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCheckinDto {
  @IsString()
  memberId: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @ApiPropertyOptional({ enum: CheckInMethod })
  @IsEnum(CheckInMethod)
  method: CheckInMethod;

  @IsOptional()
  @IsString()
  notes?: string;
}
