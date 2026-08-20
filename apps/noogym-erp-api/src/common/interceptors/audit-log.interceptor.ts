import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { BackgroundJobsService } from '../jobs/background-jobs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly backgroundJobs: BackgroundJobsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method as string;

    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user;
    const path = request.route?.path ?? request.url;
    const entity = String(path).split('/').filter(Boolean)[0] ?? 'unknown';
    const entityId = request.params?.id;

    return next.handle().pipe(
      tap(() => {
        if (!user?.organizationId) {
          return;
        }

        void this.backgroundJobs.enqueueAuditLog({
          organizationId: user.organizationId,
          userId: user.sub,
          action: `${method} ${request.url}`,
          entity,
          entityId,
          metadata: {
            params: request.params,
            query: request.query,
            supportMode: Boolean(user.supportMode),
            supportSessionId: user.supportSessionId,
            supportReason: user.supportReason,
            supportActorId: user.supportActorId,
            supportActorEmail: user.supportActorEmail,
          },
        });
      }),
    );
  }
}
