import { Module } from '@nestjs/common';
import { EmailModule } from '../common/email/email.module';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityLinksController } from './identity-links.controller';
import { IdentityLinksService } from './identity-links.service';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [IdentityLinksController],
  providers: [IdentityLinksService],
})
export class IdentityLinksModule {}
