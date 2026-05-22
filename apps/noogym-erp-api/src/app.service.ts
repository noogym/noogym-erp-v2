import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getLiveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  getReadiness() {
    const database = this.prisma.getStatus();

    if (!database.isReady) {
      throw new ServiceUnavailableException({
        message:
          'Servico temporariamente indisponivel. A API ainda esta a conectar ao banco de dados.',
        code: 'DATABASE_UNAVAILABLE',
        database,
      });
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database,
    };
  }
}
