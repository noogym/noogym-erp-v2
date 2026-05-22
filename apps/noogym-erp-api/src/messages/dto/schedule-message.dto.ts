import { Type } from 'class-transformer';
import { IsDate } from 'class-validator';

export class ScheduleMessageDto {
  @Type(() => Date)
  @IsDate()
  scheduledAt: Date;
}
