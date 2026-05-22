import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export interface DatabaseStatus {
  isReady: boolean;
  state: 'connecting' | 'connected' | 'disconnected';
  attempts: number;
  lastError?: string;
  lastCheckedAt?: string;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly retryDelayMs = Number(
    process.env.DATABASE_RETRY_DELAY_MS ?? 2000,
  );
  private attempts = 0;
  private isConnected = false;
  private isConnecting = false;
  private isShuttingDown = false;
  private lastError?: string;
  private lastCheckedAt?: string;
  private reconnectTimer?: NodeJS.Timeout;

  onModuleInit() {
    void this.connectWithRetry();
  }

  async onModuleDestroy() {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    await this.$disconnect();
  }

  isReady() {
    return this.isConnected;
  }

  getStatus(): DatabaseStatus {
    return {
      isReady: this.isConnected,
      state: this.resolveState(),
      attempts: this.attempts,
      lastError: this.lastError,
      lastCheckedAt: this.lastCheckedAt,
    };
  }

  reportConnectionError(error: unknown) {
    if (!this.isDatabaseConnectionError(error)) {
      return;
    }

    this.markDisconnected(error);
    void this.connectWithRetry();
  }

  isDatabaseConnectionError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return ['P1001', 'P1002', 'P1008', 'P1017', 'P2024'].includes(
        error.code,
      );
    }

    return (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError
    );
  }

  private async connectWithRetry() {
    if (this.isConnected || this.isConnecting || this.isShuttingDown) {
      return;
    }

    this.isConnecting = true;

    try {
      while (!this.isConnected && !this.isShuttingDown) {
        this.attempts += 1;
        this.lastCheckedAt = new Date().toISOString();

        try {
          await this.$connect();
          await this.$queryRaw`SELECT 1`;
          this.isConnected = true;
          this.lastError = undefined;
          this.logger.log('Database connection established.');
          return;
        } catch (error) {
          this.markDisconnected(error);
          this.logger.warn(
            `Database connection attempt ${this.attempts} failed. Retrying in ${this.retryDelayMs}ms.`,
          );
          await this.sleep(this.retryDelayMs);
        }
      }
    } finally {
      this.isConnecting = false;
    }
  }

  private markDisconnected(error: unknown) {
    this.isConnected = false;
    this.lastError = this.resolveErrorMessage(error);
    this.lastCheckedAt = new Date().toISOString();
  }

  private resolveState(): DatabaseStatus['state'] {
    if (this.isConnected) return 'connected';
    if (this.isConnecting) return 'connecting';
    return 'disconnected';
  }

  private resolveErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return 'Unknown database connection error';
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => {
      this.reconnectTimer = setTimeout(resolve, ms);
      this.reconnectTimer.unref?.();
    });
  }
}
