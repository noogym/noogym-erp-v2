import { Module } from '@nestjs/common';
import { DesktopSyncController } from './desktop/desktop-sync.controller';
import { DesktopSyncService } from './desktop/desktop-sync.service';
import { MobileEntrypointController } from './mobile/mobile-entrypoint.controller';
import { MobileEntrypointService } from './mobile/mobile-entrypoint.service';
import { WebAdminEntrypointController } from './web-admin/web-admin-entrypoint.controller';
import { WebAdminEntrypointService } from './web-admin/web-admin-entrypoint.service';

@Module({
  controllers: [
    WebAdminEntrypointController,
    MobileEntrypointController,
    DesktopSyncController,
  ],
  providers: [
    WebAdminEntrypointService,
    MobileEntrypointService,
    DesktopSyncService,
  ],
})
export class EntrypointsModule {}
