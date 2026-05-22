import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { of } from 'rxjs';
import { DatabaseReadinessInterceptor } from './database-readiness.interceptor';

describe('DatabaseReadinessInterceptor', () => {
  const next = {
    handle: jest.fn(() => of({ ok: true })),
  };
  const prisma = {
    isReady: jest.fn(),
    isDatabaseConnectionError: jest.fn(),
    reportConnectionError: jest.fn(),
  };

  const contextFor = (request: {
    method: string;
    path: string;
    url?: string;
  }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ ...request, url: request.url ?? request.path }),
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.isReady.mockReturnValue(true);
    prisma.isDatabaseConnectionError.mockReturnValue(false);
  });

  it('allows liveness checks even when the database is not ready', (done) => {
    prisma.isReady.mockReturnValue(false);
    const interceptor = new DatabaseReadinessInterceptor(prisma as never);

    interceptor
      .intercept(contextFor({ method: 'GET', path: '/health/live' }), next)
      .subscribe((value) => {
        expect(value).toEqual({ ok: true });
        expect(next.handle).toHaveBeenCalled();
        done();
      });
  });

  it('returns service unavailable for business routes when database is not ready', () => {
    prisma.isReady.mockReturnValue(false);
    const interceptor = new DatabaseReadinessInterceptor(prisma as never);

    expect(() =>
      interceptor.intercept(contextFor({ method: 'POST', path: '/auth/login' }), next),
    ).toThrow(ServiceUnavailableException);
    expect(next.handle).not.toHaveBeenCalled();
  });
});
