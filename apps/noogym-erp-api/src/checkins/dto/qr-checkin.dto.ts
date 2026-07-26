import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString } from 'class-validator';

export class QrCheckinDto {
  @IsString()
  payload: string;

  @IsOptional()
  @IsString()
  gymId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkedAt?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}
