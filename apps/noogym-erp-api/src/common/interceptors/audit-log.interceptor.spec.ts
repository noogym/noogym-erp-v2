import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';

describe('AuditLogInterceptor', () => {
  const backgroundJobs = {
    enqueueAuditLog: jest.fn().mockResolvedValue({ id: 'job-1' }),
  };

  const next = {
    handle: jest.fn(() => of({ ok: true })),
  };

  const contextFor = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    next.handle.mockReturnValue(of({ ok: true }));
  });

  it('creates audit log for authenticated write requests without storing body', (done) => {
    const interceptor = new AuditLogInterceptor(backgroundJobs as any);

    interceptor
      .intercept(
        contextFor({
          method: 'PATCH',
          url: '/members/member-1',
          route: { path: '/members/:id' },
          params: { id: 'member-1' },
          query: { source: 'admin' },
          body: { password: 'secret', token: 'sensitive' },
          user: {
            sub: 'user-1',
            organizationId: 'org-1',
          },
        }),
        next,
      )
      .subscribe(() => {
        expect(backgroundJobs.enqueueAuditLog).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationId: 'org-1',
            userId: 'user-1',
            action: 'PATCH /members/member-1',
            entity: 'members',
            entityId: 'member-1',
            metadata: expect.objectContaining({
              params: { id: 'member-1' },
              query: { source: 'admin' },
              supportMode: false,
            }),
          }),
        );
        expect(
          backgroundJobs.enqueueAuditLog.mock.calls[0][0].metadata,
        ).not.toHaveProperty('body');
        done();
      });
  });

  it('does not audit read requests', (done) => {
    const interceptor = new AuditLogInterceptor(backgroundJobs as any);

    interceptor
      .intercept(
        contextFor({
          method: 'GET',
          url: '/members',
          user: {
            sub: 'user-1',
            organizationId: 'org-1',
          },
        }),
        next,
      )
      .subscribe(() => {
        expect(backgroundJobs.enqueueAuditLog).not.toHaveBeenCalled();
        done();
      });
  });

  it('does not audit unauthenticated write requests', (done) => {
    const interceptor = new AuditLogInterceptor(backgroundJobs as any);

    interceptor
      .intercept(
        contextFor({
          method: 'POST',
          url: '/auth/login',
          params: {},
          query: {},
        }),
        next,
      )
      .subscribe(() => {
        expect(backgroundJobs.enqueueAuditLog).not.toHaveBeenCalled();
        done();
      });
  });
});
