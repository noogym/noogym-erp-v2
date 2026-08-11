import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IdentityLinksController } from './identity-links.controller';
import { IdentityLinksService } from './identity-links.service';

@Module({
  imports: [PrismaModule],
  controllers: [IdentityLinksController],
  providers: [IdentityLinksService],
})
export class IdentityLinksModule {}
