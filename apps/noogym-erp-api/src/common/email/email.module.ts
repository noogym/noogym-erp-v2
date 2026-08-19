import { Module } from '@nestjs/common';
import { EmailDeliveryService } from './email-delivery.service';
import { EmailQueueService } from './email-queue.service';
import { EmailTemplateService } from './email-template.service';

@Module({
  providers: [EmailDeliveryService, EmailQueueService, EmailTemplateService],
  exports: [EmailDeliveryService, EmailQueueService, EmailTemplateService],
})
export class EmailModule {}
