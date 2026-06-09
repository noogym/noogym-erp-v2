import { ApiPropertyOptional } from '@nestjs/swagger';
import { CheckInMethod } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

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
  @Type(() => Date)
  @IsDate()
  checkedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
