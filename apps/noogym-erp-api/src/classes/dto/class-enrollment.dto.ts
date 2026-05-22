import { ApiPropertyOptional } from '@nestjs/swagger';
import { ClassEnrollmentStatus } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateClassEnrollmentDto {
  @IsString()
  memberId: string;
}

export class UpdateClassEnrollmentDto {
  @ApiPropertyOptional({ enum: ClassEnrollmentStatus })
  @IsEnum(ClassEnrollmentStatus)
  status: ClassEnrollmentStatus;
}
