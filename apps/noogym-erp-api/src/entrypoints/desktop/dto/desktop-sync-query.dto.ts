import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DesktopSyncQueryDto {
  @IsOptional()
  @IsDateString()
  since?: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 100;
}
