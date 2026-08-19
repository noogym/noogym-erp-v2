import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailDeliveryStatus, Prisma } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import {
  EmailDeliveryService,
  SendEmailInput,
} from './email-delivery.service';

type QueueEmailInput = SendEmailInput & {
  maxAttempts?: number;
  messageId?: string;
  messageRecipientId?: string;
  metadata?: Prisma.InputJsonValue;
  organizationId?: string;
};

type EmailJob = {
  deliveryId: string;
};

export type QueueEmailResult = {
  deliveryId: string;
  queued: boolean;
  sent: boolean;
  status: EmailDeliveryStatus;
};

const emailQueueName = 'noogym-email-delivery';

@Injectable()
export class EmailQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailQueueService.name);
  private connection?: IORedis;
  private queue?: Queue<EmailJob>;
  private worker?: Worker<EmailJob>;
  private recoveryTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailDelivery: EmailDeliveryService,
  ) {}

  async onModuleInit() {
    if (!this.isQueueEnabled()) return;

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'EMAIL_QUEUE_ENABLED is true but REDIS_URL is not configured. Email queue will use direct fallback.',
      );
      return;
    }

    this.connection = new IORedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue<EmailJob>(emailQueueName, {
      connection: this.connection,
    });

    if (this.isWorkerEnabled()) {
      this.worker = new Worker<EmailJob>(
        emailQueueName,
        (job) => this.processJob(job),
        {
          connection: this.connection,
          concurrency: Number(this.config.get<string>('EMAIL_WORKER_CONCURRENCY', '5')),
        },
      );
      this.worker.on('failed', (job, error) => {
        this.logger.warn(
          `Email job ${job?.id ?? 'unknown'} failed: ${error.message}`,
        );
      });
      await this.recoverPendingDeliveries();
      this.startRecoveryLoop();
    }
  }

  async onModuleDestroy() {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async queueEmail(input: QueueEmailInput): Promise<QueueEmailResult> {
    const delivery = await this.prisma.emailDelivery.create({
      data: {
        organizationId: input.organizationId,
        to: this.normalizeRecipients(input.to),
        subject: input.subject,
        text: input.text,
        html: input.html,
        maxAttempts: input.maxAttempts ?? this.maxAttempts(),
        metadata: input.metadata,
        messageId: input.messageId,
        messageRecipientId: input.messageRecipientId,
      },
    });

    if (this.queue) {
      try {
        await this.enqueueDelivery(delivery.id, delivery.maxAttempts);
        return {
          deliveryId: delivery.id,
          queued: true,
          sent: false,
          status: EmailDeliveryStatus.QUEUED,
        };
      } catch (error) {
        this.logger.error(
          `Email delivery ${delivery.id} was persisted but Redis enqueue failed: ${this.errorMessage(error)}`,
        );
        if (this.isQueueRequired()) {
          return {
            deliveryId: delivery.id,
            queued: false,
            sent: false,
            status: EmailDeliveryStatus.QUEUED,
          };
        }
      }
    }

    if (this.isQueueRequired()) {
      this.logger.error(
        `Email delivery ${delivery.id} was persisted but not queued because Redis is unavailable.`,
      );
      return {
        deliveryId: delivery.id,
        queued: false,
        sent: false,
        status: EmailDeliveryStatus.QUEUED,
      };
    }

    return this.processDelivery(delivery.id, { rethrow: false });
  }

  async processDelivery(
    deliveryId: string,
    options: { rethrow: boolean } = { rethrow: true },
  ): Promise<QueueEmailResult> {
    const current = await this.prisma.emailDelivery.findUnique({
      where: { id: deliveryId },
    });
    if (!current) throw new Error(`Email delivery ${deliveryId} not found`);
    if (current.status === EmailDeliveryStatus.SENT) {
      return {
        deliveryId,
        queued: false,
        sent: true,
        status: EmailDeliveryStatus.SENT,
      };
    }

    const attempts = current.attempts + 1;
    await this.prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        attempts,
        status: EmailDeliveryStatus.PROCESSING,
        processingAt: new Date(),
        lastError: null,
      },
    });

    try {
      const result = await this.emailDelivery.sendEmail({
        to: current.to,
        subject: current.subject,
        text: current.text ?? undefined,
        html: current.html ?? undefined,
      });

      if (!result.sent) {
        throw new Error('No configured email provider accepted this message.');
      }

      await this.prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status: EmailDeliveryStatus.SENT,
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          sentAt: new Date(),
          failedAt: null,
          lastError: null,
        },
      });
      await this.markRelatedMessageSent(current.messageRecipientId, current.messageId);

      return {
        deliveryId,
        queued: false,
        sent: true,
        status: EmailDeliveryStatus.SENT,
      };
    } catch (error) {
      const status =
        attempts >= current.maxAttempts
          ? EmailDeliveryStatus.FAILED
          : EmailDeliveryStatus.RETRYING;
      await this.prisma.emailDelivery.update({
        where: { id: deliveryId },
        data: {
          status,
          lastError: this.errorMessage(error),
          failedAt: status === EmailDeliveryStatus.FAILED ? new Date() : null,
        },
      });
      if (status === EmailDeliveryStatus.FAILED) {
        await this.markRelatedMessageFailed(
          current.messageRecipientId,
          current.messageId,
        );
      }
      if (options.rethrow) throw error;

      return {
        deliveryId,
        queued: false,
        sent: false,
        status,
      };
    }
  }

  private async processJob(job: Job<EmailJob>) {
    await this.processDelivery(job.data.deliveryId, { rethrow: true });
  }

  private async enqueueDelivery(deliveryId: string, maxAttempts: number) {
    const job = await this.queue!.add(
      'send',
      { deliveryId },
      {
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: Number(this.config.get<string>('EMAIL_RETRY_DELAY_MS', '60000')),
        },
        jobId: deliveryId,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    );
    await this.prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: { jobId: String(job.id) },
    });
  }

  private async recoverPendingDeliveries() {
    if (!this.queue) return;
    const pending = await this.prisma.emailDelivery.findMany({
      where: {
        status: {
          in: [EmailDeliveryStatus.QUEUED, EmailDeliveryStatus.RETRYING],
        },
      },
      take: Number(this.config.get<string>('EMAIL_RECOVERY_BATCH_SIZE', '100')),
      orderBy: { queuedAt: 'asc' },
    });

    await Promise.all(
      pending.map((delivery) =>
        this.enqueueDelivery(delivery.id, delivery.maxAttempts).catch((error) =>
          this.logger.warn(
            `Could not recover email delivery ${delivery.id}: ${this.errorMessage(error)}`,
          ),
        ),
      ),
    );
  }

  private startRecoveryLoop() {
    const intervalMs = Number(
      this.config.get<string>('EMAIL_RECOVERY_INTERVAL_MS', '60000'),
    );
    this.recoveryTimer = setInterval(() => {
      void this.recoverPendingDeliveries();
    }, intervalMs);
    this.recoveryTimer.unref?.();
  }

  private async markRelatedMessageSent(
    messageRecipientId?: string | null,
    messageId?: string | null,
  ) {
    if (messageRecipientId) {
      await this.prisma.messageRecipient.update({
        where: { id: messageRecipientId },
        data: { delivered: true },
      });
    }
    if (messageId) {
      const activeDeliveries = await this.prisma.emailDelivery.count({
        where: {
          messageId,
          status: {
            in: [
              EmailDeliveryStatus.QUEUED,
              EmailDeliveryStatus.PROCESSING,
              EmailDeliveryStatus.RETRYING,
            ],
          },
        },
      });
      if (activeDeliveries > 0) return;

      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'SENT', sentAt: new Date() },
      });
    }
  }

  private async markRelatedMessageFailed(
    messageRecipientId?: string | null,
    messageId?: string | null,
  ) {
    if (!messageId) return;
    const activeDeliveries = await this.prisma.emailDelivery.count({
      where: {
        messageId,
        status: {
          in: [
            EmailDeliveryStatus.QUEUED,
            EmailDeliveryStatus.PROCESSING,
            EmailDeliveryStatus.RETRYING,
          ],
        },
      },
    });
    const deliveredRecipients = await this.prisma.messageRecipient.count({
      where: { messageId, delivered: true },
    });

    if (!activeDeliveries && !deliveredRecipients) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { status: 'FAILED', sentAt: null },
      });
    }
  }

  private isQueueEnabled() {
    return this.config.get<string>('EMAIL_QUEUE_ENABLED', 'false') === 'true';
  }

  private isQueueRequired() {
    return this.config.get<string>('EMAIL_QUEUE_REQUIRED', 'false') === 'true';
  }

  private isWorkerEnabled() {
    return this.config.get<string>('EMAIL_WORKER_ENABLED', 'true') !== 'false';
  }

  private maxAttempts() {
    return Number(this.config.get<string>('EMAIL_MAX_ATTEMPTS', '5'));
  }

  private normalizeRecipients(to: string | string[]) {
    return Array.isArray(to) ? to.join(',') : to;
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown email error';
  }
}
