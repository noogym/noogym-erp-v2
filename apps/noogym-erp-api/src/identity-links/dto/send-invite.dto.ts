import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel } from '@prisma/client';
import { IsArray, IsEnum, IsOptional } from 'class-validator';

export class SendInviteDto {
  @ApiPropertyOptional({ enum: MessageChannel, isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(MessageChannel, { each: true })
  channels?: MessageChannel[];
}
