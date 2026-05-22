import { Type } from 'class-transformer';
import { IsBoolean, IsDate, IsOptional, IsString } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  memberId: string;

  @IsString()
  planId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
