import { Global, Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { BackgroundJobsController } from './background-jobs.controller';
import { BackgroundJobsService } from './background-jobs.service';

@Global()
@Module({
  imports: [EmailModule],
  controllers: [BackgroundJobsController],
  providers: [BackgroundJobsService],
  exports: [BackgroundJobsService],
})
export class BackgroundJobsModule {}
