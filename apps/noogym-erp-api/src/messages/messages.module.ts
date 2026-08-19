import { Module } from '@nestjs/common';
import { EmailModule } from '../common/email/email.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [EmailModule],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
