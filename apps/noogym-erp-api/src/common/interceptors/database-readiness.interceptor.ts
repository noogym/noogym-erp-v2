import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request } from 'express';
import { catchError, Observable, throwError } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

const UNAVAILABLE_RESPONSE = {
  message:
    'Servico temporariamente indisponivel. A API ainda esta a conectar ao banco de dados.',
  code: 'DATABASE_UNAVAILABLE',
};

@Injectable()
export class DatabaseReadinessInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    if (this.isExemptRoute(request)) {
      return next.handle();
    }

    if (!this.prisma.isReady()) {
      throw new ServiceUnavailableException(UNAVAILABLE_RESPONSE);
    }

    return next.handle().pipe(
      catchError((error) => {
        if (this.prisma.isDatabaseConnectionError(error)) {
          this.prisma.reportConnectionError(error);
          return throwError(
            () => new ServiceUnavailableException(UNAVAILABLE_RESPONSE),
          );
        }

        return throwError(() => error);
      }),
    );
  }

  private isExemptRoute(request: Request) {
    const path = request.path ?? request.url;

    return (
      (request.method === 'GET' && path === '/') ||
      path === '/openapi.json' ||
      path.startsWith('/health') ||
      path.startsWith('/docs') ||
      path.startsWith('/reference')
    );
  }
}
