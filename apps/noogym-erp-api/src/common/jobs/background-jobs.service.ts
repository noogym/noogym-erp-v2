import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MemberStatus,
  PaymentStatus,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { EmailQueueService } from '../email/email-queue.service';
import { EmailTemplateService } from '../email/email-template.service';
import { PaginationQueryDto } from '../dto/pagination-query.dto';
import { getPagination, paginated } from '../utils/pagination';
import { PrismaService } from '../../prisma/prisma.service';

export const backgroundQueueName = 'noogym-background-jobs';

export const backgroundJobNames = {
  auditWrite: 'audit.write',
  analyticsRecalculate: 'analytics.recalculate',
  aiChurnRisk: 'ai.churn-risk',
  aiRecommendations: 'ai.recommendations',
  aiRetentionInsights: 'ai.retention-insights',
  checkinsAfterCheckin: 'checkins.after-checkin',
  checkinsProcessBatch: 'checkins.process-batch',
  filesCleanupOrphans: 'files.cleanup-orphans',
  filesProcessAvatar: 'files.process-avatar',
  integrationsCrmAnalytics: 'integrations.crm-analytics',
  integrationsRetryFailed: 'integrations.retry-failed',
  integrationsWebhook: 'integrations.webhook',
  marketingCampaignDispatch: 'marketing.campaign.dispatch',
  marketingSegmentBuild: 'marketing.segment-build',
  notificationsCampaign: 'notifications.campaign',
  notificationsEmail: 'notifications.email',
  notificationsPaymentReminder: 'notifications.payment-reminder',
  notificationsPush: 'notifications.push',
  notificationsSms: 'notifications.sms',
  notificationsWhatsapp: 'notifications.whatsapp',
  paymentsAfterPaid: 'payments.after-paid',
  paymentsConfirmGateway: 'payments.confirm-gateway',
  paymentsGenerateReceipt: 'payments.generate-receipt',
  paymentsReconcilePending: 'payments.reconcile-pending',
  reportsExport: 'reports.export',
  reportsMonthlyGym: 'reports.monthly-gym',
  syncDesktop: 'sync.desktop',
  syncMobile: 'sync.mobile',
  subscriptionsAutoRenew: 'subscriptions.auto-renew',
  subscriptionsCleanupTokens: 'auth.cleanup-expired-tokens',
  subscriptionsExpiryReminders: 'subscriptions.expiry-reminders',
  subscriptionsMarkExpired: 'subscriptions.mark-expired',
} as const;

type BackgroundJobName =
  (typeof backgroundJobNames)[keyof typeof backgroundJobNames];

type BackgroundJobPayload = Prisma.InputJsonValue;

type QueueBackgroundJobInput = {
  delayMs?: number;
  dedupeKey?: string;
  maxAttempts?: number;
  name: BackgroundJobName | string;
  organizationId?: string | null;
  payload?: BackgroundJobPayload;
  queue?: string;
  referenceId?: string | null;
};

type BackgroundBullJob = {
  backgroundJobId: string;
};

type HandlerResult = {
  result?: Prisma.InputJsonValue;
  status?: 'COMPLETED' | 'SKIPPED';
};

@Injectable()
export class BackgroundJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BackgroundJobsService.name);
  private connection?: IORedis;
  private queue?: Queue<BackgroundBullJob>;
  private worker?: Worker<BackgroundBullJob>;
  private recoveryTimer?: NodeJS.Timeout;
  private schedulerTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  async onModuleInit() {
    if (!this.isEnabled()) return;

    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) {
      this.logger.warn(
        'BACKGROUND_JOBS_ENABLED is true but REDIS_URL is not configured. Jobs will run inline unless required.',
      );
      return;
    }

    this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<BackgroundBullJob>(backgroundQueueName, {
      connection: this.connection,
    });

    if (this.isWorkerEnabled()) {
      this.worker = new Worker<BackgroundBullJob>(
        backgroundQueueName,
        (job) => this.processBullJob(job),
        {
          connection: this.connection,
          concurrency: Number(
            this.config.get<string>('BACKGROUND_WORKER_CONCURRENCY', '5'),
          ),
        },
      );
      this.worker.on('failed', (job, error) => {
        this.logger.warn(
          `Background job ${job?.id ?? 'unknown'} failed: ${error.message}`,
        );
      });
      await this.recoverPendingJobs();
      await this.enqueueRecurringMaintenance();
      this.startRecoveryLoop();
      this.startSchedulerLoop();
    }
  }

  async onModuleDestroy() {
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    if (this.schedulerTimer) clearInterval(this.schedulerTimer);
    await this.worker?.close();
    await this.queue?.close();
    await this.connection?.quit();
  }

  async enqueue(input: QueueBackgroundJobInput) {
    const maxAttempts = input.maxAttempts ?? this.maxAttempts();
    const payload = input.payload ?? {};
    const scheduledAt = input.delayMs
      ? new Date(Date.now() + input.delayMs)
      : undefined;

    const backgroundJob = input.dedupeKey
      ? await this.findOrCreateDedupedJob(input, payload, maxAttempts, scheduledAt)
      : await this.prisma.backgroundJob.create({
          data: {
            organizationId: input.organizationId ?? undefined,
            queue: input.queue ?? backgroundQueueName,
            name: input.name,
            payload,
            referenceId: input.referenceId ?? undefined,
            maxAttempts,
            scheduledAt,
          },
        });

    if (backgroundJob.status === 'COMPLETED' || backgroundJob.status === 'SKIPPED') {
      return backgroundJob;
    }

    if (this.queue) {
      await this.enqueueBullJob(backgroundJob.id, maxAttempts, input.delayMs);
      return backgroundJob;
    }

    if (this.isRequired()) {
      this.logger.error(
        `Background job ${backgroundJob.id} was persisted but Redis is unavailable.`,
      );
      return backgroundJob;
    }

    await this.processBackgroundJob(backgroundJob.id, { rethrow: false });
    return this.prisma.backgroundJob.findUnique({ where: { id: backgroundJob.id } });
  }

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.BackgroundJobWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { queue: { contains: query.search } },
              { referenceId: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.backgroundJob.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.backgroundJob.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async enqueueAuditLog(input: {
    action: string;
    entity: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
    organizationId?: string;
    userId?: string;
  }) {
    if (!input.organizationId) return undefined;

    return this.enqueue({
      name: backgroundJobNames.auditWrite,
      organizationId: input.organizationId,
      payload: input,
      referenceId: input.entityId,
      maxAttempts: 3,
    });
  }

  async enqueuePaymentPaid(organizationId: string, paymentId: string) {
    return this.enqueue({
      dedupeKey: `payments.after-paid:${paymentId}`,
      name: backgroundJobNames.paymentsAfterPaid,
      organizationId,
      payload: { paymentId },
      referenceId: paymentId,
    });
  }

  async enqueueCheckinProcessed(organizationId: string, checkinId: string) {
    return this.enqueue({
      dedupeKey: `checkins.after-checkin:${checkinId}`,
      name: backgroundJobNames.checkinsAfterCheckin,
      organizationId,
      payload: { checkinId },
      referenceId: checkinId,
      maxAttempts: 3,
    });
  }

  async processBackgroundJob(
    id: string,
    options: { rethrow: boolean } = { rethrow: true },
  ) {
    const current = await this.prisma.backgroundJob.findUnique({
      where: { id },
    });
    if (!current) throw new Error(`Background job ${id} not found`);
    if (current.status === 'COMPLETED' || current.status === 'SKIPPED') {
      return current;
    }

    const attempts = current.attempts + 1;
    await this.prisma.backgroundJob.update({
      where: { id },
      data: {
        attempts,
        failedAt: null,
        lastError: null,
        processingAt: new Date(),
        status: 'PROCESSING',
      },
    });

    try {
      const handlerResult = await this.dispatch(current.name, current.payload);
      return this.prisma.backgroundJob.update({
        where: { id },
        data: {
          completedAt: new Date(),
          failedAt: null,
          lastError: null,
          result: handlerResult.result ?? {},
          status: handlerResult.status ?? 'COMPLETED',
        },
      });
    } catch (error) {
      const status = attempts >= current.maxAttempts ? 'FAILED' : 'RETRYING';
      await this.prisma.backgroundJob.update({
        where: { id },
        data: {
          failedAt: status === 'FAILED' ? new Date() : null,
          lastError: this.errorMessage(error),
          status,
        },
      });
      if (options.rethrow) throw error;
      return this.prisma.backgroundJob.findUnique({ where: { id } });
    }
  }

  private processBullJob(job: Job<BackgroundBullJob>) {
    return this.processBackgroundJob(job.data.backgroundJobId, {
      rethrow: true,
    });
  }

  private async findOrCreateDedupedJob(
    input: QueueBackgroundJobInput,
    payload: BackgroundJobPayload,
    maxAttempts: number,
    scheduledAt?: Date,
  ) {
    const existing = await this.prisma.backgroundJob.findUnique({
      where: { dedupeKey: input.dedupeKey },
    });

    if (existing) return existing;

    return this.prisma.backgroundJob.create({
      data: {
        dedupeKey: input.dedupeKey,
        organizationId: input.organizationId ?? undefined,
        queue: input.queue ?? backgroundQueueName,
        name: input.name,
        payload,
        referenceId: input.referenceId ?? undefined,
        maxAttempts,
        scheduledAt,
      },
    });
  }

  private async enqueueBullJob(
    backgroundJobId: string,
    maxAttempts: number,
    delayMs?: number,
  ) {
    const job = await this.queue!.add(
      'run',
      { backgroundJobId },
      {
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: Number(
            this.config.get<string>('BACKGROUND_RETRY_DELAY_MS', '60000'),
          ),
        },
        delay: delayMs,
        jobId: backgroundJobId,
        removeOnComplete: { count: 5000 },
        removeOnFail: { count: 10000 },
      },
    );
    await this.prisma.backgroundJob.update({
      where: { id: backgroundJobId },
      data: { jobId: String(job.id) },
    });
  }

  private async recoverPendingJobs() {
    if (!this.queue) return;
    const pending = await this.prisma.backgroundJob.findMany({
      where: {
        status: { in: ['QUEUED', 'RETRYING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'asc' },
      take: Number(
        this.config.get<string>('BACKGROUND_RECOVERY_BATCH_SIZE', '200'),
      ),
    });

    await Promise.all(
      pending.map((job) =>
        this.enqueueBullJob(job.id, job.maxAttempts).catch((error) =>
          this.logger.warn(
            `Could not recover background job ${job.id}: ${this.errorMessage(error)}`,
          ),
        ),
      ),
    );
  }

  private async enqueueRecurringMaintenance() {
    if (!this.isRecurringEnabled()) return;
    const stamp = this.dayStamp();
    const nowSlot = this.hourStamp();

    await Promise.all([
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.paymentsReconcilePending}:${nowSlot}`,
        name: backgroundJobNames.paymentsReconcilePending,
        payload: { scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.subscriptionsMarkExpired}:${nowSlot}`,
        name: backgroundJobNames.subscriptionsMarkExpired,
        payload: { scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.subscriptionsAutoRenew}:${stamp}`,
        name: backgroundJobNames.subscriptionsAutoRenew,
        payload: { scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.subscriptionsExpiryReminders}:${stamp}`,
        name: backgroundJobNames.subscriptionsExpiryReminders,
        payload: { daysBefore: 3, scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.subscriptionsCleanupTokens}:${stamp}`,
        name: backgroundJobNames.subscriptionsCleanupTokens,
        payload: { scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.analyticsRecalculate}:${stamp}`,
        name: backgroundJobNames.analyticsRecalculate,
        payload: { scope: 'all-organizations' },
      }),
      this.enqueue({
        dedupeKey: `recurring:${backgroundJobNames.filesCleanupOrphans}:${stamp}`,
        name: backgroundJobNames.filesCleanupOrphans,
        payload: { scope: 'all-organizations' },
      }),
    ]);
  }

  private startRecoveryLoop() {
    const intervalMs = Number(
      this.config.get<string>('BACKGROUND_RECOVERY_INTERVAL_MS', '60000'),
    );
    this.recoveryTimer = setInterval(() => {
      void this.recoverPendingJobs();
    }, intervalMs);
    this.recoveryTimer.unref?.();
  }

  private startSchedulerLoop() {
    const intervalMs = Number(
      this.config.get<string>('BACKGROUND_SCHEDULER_INTERVAL_MS', '900000'),
    );
    this.schedulerTimer = setInterval(() => {
      void this.enqueueRecurringMaintenance();
    }, intervalMs);
    this.schedulerTimer.unref?.();
  }

  private async dispatch(
    name: string,
    payload: Prisma.JsonValue | null,
  ): Promise<HandlerResult> {
    switch (name) {
      case backgroundJobNames.auditWrite:
        return this.handleAuditWrite(payload);
      case backgroundJobNames.notificationsEmail:
        return this.handleEmailNotification(payload);
      case backgroundJobNames.notificationsSms:
      case backgroundJobNames.notificationsWhatsapp:
      case backgroundJobNames.notificationsPush:
        return this.skipped(`${name} provider is not configured yet.`);
      case backgroundJobNames.notificationsCampaign:
      case backgroundJobNames.marketingCampaignDispatch:
        return this.handleMarketingCampaign(payload);
      case backgroundJobNames.marketingSegmentBuild:
        return this.handleMarketingSegment(payload);
      case backgroundJobNames.notificationsPaymentReminder:
        return this.handlePaymentReminder(payload);
      case backgroundJobNames.reportsExport:
        return this.handleReportExport(payload);
      case backgroundJobNames.reportsMonthlyGym:
        return this.handleMonthlyGymReport(payload);
      case backgroundJobNames.paymentsAfterPaid:
        return this.handlePaymentAfterPaid(payload);
      case backgroundJobNames.paymentsGenerateReceipt:
        return this.handleGenerateReceipt(payload);
      case backgroundJobNames.paymentsConfirmGateway:
        return this.skipped('Payment gateway confirmation is waiting for gateway integration.');
      case backgroundJobNames.paymentsReconcilePending:
        return this.handleReconcilePendingPayments(payload);
      case backgroundJobNames.subscriptionsMarkExpired:
        return this.handleMarkExpiredSubscriptions(payload);
      case backgroundJobNames.subscriptionsExpiryReminders:
        return this.handleSubscriptionExpiryReminders(payload);
      case backgroundJobNames.subscriptionsAutoRenew:
        return this.handleSubscriptionAutoRenew(payload);
      case backgroundJobNames.subscriptionsCleanupTokens:
        return this.handleCleanupExpiredTokens();
      case backgroundJobNames.syncMobile:
      case backgroundJobNames.syncDesktop:
      case backgroundJobNames.integrationsCrmAnalytics:
      case backgroundJobNames.integrationsWebhook:
      case backgroundJobNames.integrationsRetryFailed:
        return this.skipped(`${name} connector is not configured yet.`);
      case backgroundJobNames.checkinsAfterCheckin:
        return this.handleAfterCheckin(payload);
      case backgroundJobNames.checkinsProcessBatch:
        return this.handleCheckinBatch(payload);
      case backgroundJobNames.filesProcessAvatar:
      case backgroundJobNames.filesCleanupOrphans:
        return this.skipped(`${name} needs object storage configuration.`);
      case backgroundJobNames.analyticsRecalculate:
        return this.handleAnalyticsRecalculate(payload);
      case backgroundJobNames.aiRetentionInsights:
      case backgroundJobNames.aiChurnRisk:
      case backgroundJobNames.aiRecommendations:
        return this.handleAiMetrics(payload, name);
      default:
        return this.skipped(`No handler registered for ${name}.`);
    }
  }

  private async handleAuditWrite(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    await this.prisma.auditLog.create({
      data: {
        action: String(data.action ?? 'UNKNOWN'),
        entity: String(data.entity ?? 'unknown'),
        entityId: this.optionalString(data.entityId),
        metadata: this.jsonObject(data.metadata),
        organizationId: this.optionalString(data.organizationId),
        userId: this.optionalString(data.userId),
      },
    });
    return { result: { created: true } };
  }

  private async handleEmailNotification(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const to = this.optionalString(data.to);
    const subject = this.optionalString(data.subject);
    const text = this.optionalString(data.text);
    if (!to || !subject) {
      return this.skipped('Email notification requires to and subject.');
    }

    const result = await this.emailQueue.queueEmail({
      organizationId: this.optionalString(data.organizationId),
      to,
      subject,
      text,
      html: this.optionalString(data.html),
      metadata: this.jsonObject(data.metadata),
    });
    return { result: { deliveryId: result.deliveryId, queued: result.queued, sent: result.sent } };
  }

  private async handleMarketingCampaign(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    if (!organizationId) return this.skipped('Campaign requires organizationId.');

    const memberIds = Array.isArray(data.memberIds)
      ? data.memberIds.filter((value): value is string => typeof value === 'string')
      : [];
    const members = await this.prisma.member.findMany({
      where: {
        organizationId,
        ...(memberIds.length ? { id: { in: memberIds } } : {}),
        email: { not: null },
      },
      select: { email: true, id: true, name: true },
      take: Number(data.limit ?? 1000),
    });

    const subject = this.optionalString(data.subject) ?? 'Comunicado Noogym';
    const content =
      this.optionalString(data.content) ??
      'Temos novidades para si no ecossistema Noogym.';
    let queued = 0;
    for (const member of members) {
      if (!member.email) continue;
      await this.emailQueue.queueEmail({
        organizationId,
        to: member.email,
        subject,
        text: content,
        html: this.emailTemplate.render({
          eyebrow: 'Comunicado',
          greeting: `Ola, ${member.name}`,
          intro: [content],
          preheader: content.slice(0, 140),
          title: subject,
        }),
        metadata: { campaign: data.campaignId ?? null, memberId: member.id },
      });
      queued += 1;
    }

    return { result: { recipients: members.length, queued } };
  }

  private async handleMarketingSegment(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    if (!organizationId) return this.skipped('Segment build requires organizationId.');

    const status = this.optionalString(data.status) as MemberStatus | undefined;
    const members = await this.prisma.member.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      select: { id: true },
      take: Number(data.limit ?? 5000),
    });
    return { result: { memberIds: members.map((member) => member.id), total: members.length } };
  }

  private async handlePaymentReminder(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const paymentId = this.optionalString(data.paymentId);
    if (!paymentId) return this.skipped('Payment reminder requires paymentId.');

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: true },
    });
    if (!payment?.member?.email) {
      return this.skipped('Payment or member email not found.');
    }

    const amount = Number(payment.outstandingAmount || payment.amount);
    const content = `Tem um pagamento pendente de ${amount.toLocaleString('pt-AO')} Kz no Noogym.`;
    const result = await this.emailQueue.queueEmail({
      organizationId: payment.organizationId,
      to: payment.member.email,
      subject: 'Lembrete de pagamento Noogym',
      text: content,
      html: this.emailTemplate.render({
        button: data.paymentUrl
          ? { label: 'Ver pagamento', url: String(data.paymentUrl) }
          : undefined,
        details: [
          { label: 'Valor', value: `${amount.toLocaleString('pt-AO')} Kz` },
          { label: 'Referencia', value: payment.reference ?? payment.id },
        ],
        eyebrow: 'Pagamento',
        greeting: `Ola, ${payment.member.name}`,
        intro: [content],
        preheader: content,
        title: 'Pagamento pendente',
      }),
      metadata: { paymentId },
    });
    return { result: { deliveryId: result.deliveryId } };
  }

  private async handleReportExport(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const report = this.optionalString(data.report) ?? 'overview';
    if (!organizationId) return this.skipped('Report export requires organizationId.');

    const result = await this.reportSnapshot(organizationId, report);
    return { result: { format: data.format ?? 'json', report, snapshot: result } };
  }

  private async handleMonthlyGymReport(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    if (!organizationId) return this.skipped('Monthly gym report requires organizationId.');

    const gyms = await this.prisma.gym.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });
    const reports = await Promise.all(
      gyms.map(async (gym) => ({
        gym,
        snapshot: await this.reportSnapshot(organizationId, 'monthly-gym', gym.id),
      })),
    );
    return { result: { gyms: reports } };
  }

  private async handlePaymentAfterPaid(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const paymentId = this.optionalString(data.paymentId);
    if (!paymentId) return this.skipped('payments.after-paid requires paymentId.');

    await this.handleGenerateReceipt(payload);
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { member: true },
    });
    if (!payment || payment.status !== PaymentStatus.PAID) {
      return this.skipped('Payment is not paid.');
    }
    if (!payment.member?.email) {
      return { result: { receipt: true, notification: 'member email missing' } };
    }

    const amount = Number(payment.amount).toLocaleString('pt-AO');
    const text = `Confirmamos o pagamento de ${amount} Kz. Recibo: ${payment.receiptNumber ?? payment.id}.`;
    const result = await this.emailQueue.queueEmail({
      organizationId: payment.organizationId,
      to: payment.member.email,
      subject: 'Pagamento confirmado Noogym',
      text,
      html: this.emailTemplate.render({
        details: [
          { label: 'Valor pago', value: `${amount} Kz` },
          { label: 'Recibo', value: payment.receiptNumber ?? payment.id },
        ],
        eyebrow: 'Recibo',
        greeting: `Ola, ${payment.member.name}`,
        intro: [text],
        preheader: 'O seu pagamento foi confirmado no Noogym.',
        title: 'Pagamento confirmado',
      }),
      metadata: { paymentId },
    });
    return { result: { deliveryId: result.deliveryId, receipt: true } };
  }

  private async handleGenerateReceipt(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const paymentId = this.optionalString(data.paymentId);
    if (!paymentId) return this.skipped('Receipt generation requires paymentId.');

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, receiptNumber: true },
    });
    if (!payment) return this.skipped('Payment not found.');
    if (payment.receiptNumber) {
      return { result: { receiptNumber: payment.receiptNumber } };
    }

    const receiptNumber = `NG-${new Date().getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { receiptNumber },
    });
    return { result: { receiptNumber } };
  }

  private async handleReconcilePendingPayments(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const pending = await this.prisma.payment.count({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: PaymentStatus.PENDING,
      },
    });
    return { result: { pending, reconciled: 0, note: 'No payment gateway connector configured.' } };
  }

  private async handleMarkExpiredSubscriptions(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const now = new Date();
    const expired = await this.prisma.subscription.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: SubscriptionStatus.ACTIVE,
        endDate: { lt: now },
      },
      select: { id: true, memberId: true, organizationId: true },
      take: 5000,
    });

    if (!expired.length) return { result: { expired: 0, membersMarkedOverdue: 0 } };

    await this.prisma.subscription.updateMany({
      where: { id: { in: expired.map((subscription) => subscription.id) } },
      data: { status: SubscriptionStatus.EXPIRED },
    });

    const memberIds = [...new Set(expired.map((subscription) => subscription.memberId))];
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        memberId: { in: memberIds },
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: now },
      },
      select: { memberId: true },
    });
    const stillActive = new Set(activeSubscriptions.map((subscription) => subscription.memberId));
    const overdueMembers = memberIds.filter((memberId) => !stillActive.has(memberId));
    if (overdueMembers.length) {
      await this.prisma.member.updateMany({
        where: { id: { in: overdueMembers }, status: MemberStatus.ACTIVE },
        data: { status: MemberStatus.OVERDUE },
      });
    }

    return {
      result: {
        expired: expired.length,
        membersMarkedOverdue: overdueMembers.length,
      },
    };
  }

  private async handleSubscriptionExpiryReminders(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const daysBefore = Number(data.daysBefore ?? 3);
    const targetStart = new Date();
    targetStart.setHours(0, 0, 0, 0);
    targetStart.setDate(targetStart.getDate() + daysBefore);
    const targetEnd = new Date(targetStart);
    targetEnd.setDate(targetEnd.getDate() + 1);

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: targetStart, lt: targetEnd },
      },
      include: { member: true, plan: true },
      take: 1000,
    });

    let queued = 0;
    for (const subscription of subscriptions) {
      if (!subscription.member.email) continue;
      const content = `O seu plano ${subscription.plan.name} expira em ${daysBefore} dia(s).`;
      const result = await this.emailQueue.queueEmail({
        organizationId: subscription.organizationId,
        to: subscription.member.email,
        subject: 'O seu plano Noogym esta quase a expirar',
        text: content,
        html: this.emailTemplate.render({
          details: [
            { label: 'Plano', value: subscription.plan.name },
            { label: 'Validade', value: subscription.endDate.toLocaleDateString('pt-AO') },
          ],
          eyebrow: 'Plano',
          greeting: `Ola, ${subscription.member.name}`,
          intro: [content, 'Renove a tempo para continuar a treinar sem interrupcoes.'],
          preheader: content,
          title: 'Plano quase a expirar',
        }),
        metadata: { subscriptionId: subscription.id },
      });
      if (result.queued || result.sent) queued += 1;
    }

    return { result: { subscriptions: subscriptions.length, queued } };
  }

  private async handleSubscriptionAutoRenew(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const now = new Date();
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        autoRenew: true,
        nextBillingDate: { lte: now },
        status: SubscriptionStatus.ACTIVE,
      },
      include: { plan: true },
      take: 1000,
    });

    let createdPayments = 0;
    for (const subscription of subscriptions) {
      const existing = await this.prisma.payment.findFirst({
        where: {
          organizationId: subscription.organizationId,
          subscriptionId: subscription.id,
          status: PaymentStatus.PENDING,
        },
        select: { id: true },
      });
      if (existing) continue;
      await this.prisma.payment.create({
        data: {
          amount: subscription.plan.price,
          grossAmount: subscription.plan.price,
          discountAmount: 0,
          lateFeeAmount: 0,
          memberId: subscription.memberId,
          method: 'CASH',
          organizationId: subscription.organizationId,
          outstandingAmount: subscription.plan.price,
          status: PaymentStatus.PENDING,
          subscriptionId: subscription.id,
          dueDate: subscription.nextBillingDate ?? now,
        },
      });
      createdPayments += 1;
    }

    return { result: { subscriptions: subscriptions.length, createdPayments } };
  }

  private async handleCleanupExpiredTokens() {
    const result = await this.prisma.user.updateMany({
      where: {
        passwordResetTokenExpiresAt: { lt: new Date() },
        passwordResetTokenHash: { not: null },
      },
      data: {
        passwordResetTokenExpiresAt: null,
        passwordResetTokenHash: null,
      },
    });
    return { result: { cleaned: result.count } };
  }

  private async handleAfterCheckin(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const checkinId = this.optionalString(data.checkinId);
    if (!checkinId) return this.skipped('checkins.after-checkin requires checkinId.');

    const checkin = await this.prisma.checkIn.findUnique({
      where: { id: checkinId },
      include: { member: true },
    });
    if (!checkin) return this.skipped('Check-in not found.');

    const dayStart = new Date(checkin.checkedAt);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const duplicates = await this.prisma.checkIn.count({
      where: {
        id: { not: checkin.id },
        memberId: checkin.memberId,
        checkedAt: { gte: dayStart, lt: dayEnd },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'CHECKIN_PROCESSED',
        entity: 'checkins',
        entityId: checkin.id,
        metadata: {
          duplicatesSameDay: duplicates,
          gymId: checkin.gymId,
          memberId: checkin.memberId,
          method: checkin.method,
        },
        organizationId: checkin.organizationId,
      },
    });

    return { result: { duplicatesSameDay: duplicates } };
  }

  private async handleCheckinBatch(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const count = await this.prisma.checkIn.count({
      where: { ...(organizationId ? { organizationId } : {}) },
    });
    return { result: { processed: count } };
  }

  private async handleAnalyticsRecalculate(payload: Prisma.JsonValue | null) {
    const data = this.objectPayload(payload);
    const organizationId = this.optionalString(data.organizationId);
    const [members, activeMembers, overdueMembers, payments, checkins] =
      await this.prisma.$transaction([
        this.prisma.member.count({ where: { ...(organizationId ? { organizationId } : {}) } }),
        this.prisma.member.count({
          where: { ...(organizationId ? { organizationId } : {}), status: MemberStatus.ACTIVE },
        }),
        this.prisma.member.count({
          where: { ...(organizationId ? { organizationId } : {}), status: MemberStatus.OVERDUE },
        }),
        this.prisma.payment.aggregate({
          where: { ...(organizationId ? { organizationId } : {}), status: PaymentStatus.PAID },
          _sum: { amount: true },
        }),
        this.prisma.checkIn.count({ where: { ...(organizationId ? { organizationId } : {}) } }),
      ]);

    return {
      result: {
        activeMembers,
        checkins,
        members,
        overdueMembers,
        paidRevenue: Number(payments._sum.amount ?? 0),
      },
    };
  }

  private async handleAiMetrics(payload: Prisma.JsonValue | null, name: string) {
    const analytics = await this.handleAnalyticsRecalculate(payload);
    return {
      result: {
        mode: 'rules-based',
        name,
        snapshot: analytics.result,
        note: 'AI provider not configured. Returned deterministic metrics.',
      },
    };
  }

  private async reportSnapshot(
    organizationId: string,
    report: string,
    gymId?: string,
  ) {
    const where = { organizationId, ...(gymId ? { gymId } : {}) };
    const [members, checkins, paidPayments, pendingPayments] =
      await this.prisma.$transaction([
        this.prisma.member.count({ where }),
        this.prisma.checkIn.count({ where }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            status: PaymentStatus.PAID,
            ...(gymId ? { member: { gymId } } : {}),
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.payment.aggregate({
          where: {
            organizationId,
            status: PaymentStatus.PENDING,
            ...(gymId ? { member: { gymId } } : {}),
          },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

    return {
      checkins,
      generatedAt: new Date().toISOString(),
      gymId,
      members,
      paidPayments: paidPayments._count.id,
      pendingPayments: pendingPayments._count.id,
      pendingRevenue: Number(pendingPayments._sum.amount ?? 0),
      report,
      revenue: Number(paidPayments._sum.amount ?? 0),
    };
  }

  private skipped(reason: string): HandlerResult {
    return { result: { reason }, status: 'SKIPPED' };
  }

  private objectPayload(payload: Prisma.JsonValue | null) {
    return payload && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, Prisma.JsonValue>)
      : {};
  }

  private jsonObject(value: unknown): Prisma.InputJsonObject | undefined {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Prisma.InputJsonObject)
      : undefined;
  }

  private optionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value : undefined;
  }

  private dayStamp() {
    return new Date().toISOString().slice(0, 10);
  }

  private hourStamp() {
    return new Date().toISOString().slice(0, 13);
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown background job error';
  }

  private isEnabled() {
    return this.config.get<string>('BACKGROUND_JOBS_ENABLED', 'true') !== 'false';
  }

  private isWorkerEnabled() {
    return this.config.get<string>('BACKGROUND_WORKER_ENABLED', 'true') !== 'false';
  }

  private isRequired() {
    return this.config.get<string>('BACKGROUND_JOBS_REQUIRED', 'false') === 'true';
  }

  private isRecurringEnabled() {
    return this.config.get<string>('BACKGROUND_RECURRING_ENABLED', 'true') !== 'false';
  }

  private maxAttempts() {
    return Number(this.config.get<string>('BACKGROUND_MAX_ATTEMPTS', '5'));
  }
}
