import { ApiPropertyOptional } from '@nestjs/swagger';
import { MessageChannel, MessageStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: MessageChannel })
  @IsEnum(MessageChannel)
  channel: MessageChannel;

  @ApiPropertyOptional({ enum: MessageStatus })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledAt?: Date;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  memberIds: string[];
}
