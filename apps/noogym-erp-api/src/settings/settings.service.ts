import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { defaultOperationalSettings } from './operational-settings.defaults';

type JsonRecord = Record<string, unknown>;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOperational(organizationId: string) {
    const record = await this.prisma.operationalSetting.findUnique({
      where: { organizationId },
    });

    return this.mergeSettings(record?.settings);
  }

  async updateOperational(organizationId: string, settings: JsonRecord) {
    const merged = this.mergeSettings(settings);

    const record = await this.prisma.operationalSetting.upsert({
      where: { organizationId },
      create: {
        organizationId,
        settings: merged as Prisma.InputJsonValue,
      },
      update: {
        settings: merged as Prisma.InputJsonValue,
      },
    });

    return this.mergeSettings(record.settings);
  }

  async resetOperational(organizationId: string) {
    const record = await this.prisma.operationalSetting.upsert({
      where: { organizationId },
      create: {
        organizationId,
        settings: defaultOperationalSettings as Prisma.InputJsonValue,
      },
      update: {
        settings: defaultOperationalSettings as Prisma.InputJsonValue,
      },
    });

    return this.mergeSettings(record.settings);
  }

  private mergeSettings(settings: unknown) {
    const partial = this.asRecord(settings);
    const defaults = defaultOperationalSettings;

    return {
      preferences: {
        ...defaults.preferences,
        ...this.asRecord(partial.preferences),
      },
      gymHours: {
        ...defaults.gymHours,
        ...this.asRecord(partial.gymHours),
      },
      finance: {
        ...defaults.finance,
        ...this.asRecord(partial.finance),
        paymentMethods: Array.isArray(this.asRecord(partial.finance).paymentMethods)
          ? this.asRecord(partial.finance).paymentMethods
          : defaults.finance.paymentMethods,
      },
      contracts: {
        ...defaults.contracts,
        ...this.asRecord(partial.contracts),
      },
      checkin: {
        ...defaults.checkin,
        ...this.asRecord(partial.checkin),
      },
      notifications: {
        ...defaults.notifications,
        ...this.asRecord(partial.notifications),
      },
      integrations: {
        ...defaults.integrations,
        ...this.asRecord(partial.integrations),
      },
      printing: {
        ...defaults.printing,
        ...this.asRecord(partial.printing),
      },
      backup: {
        ...defaults.backup,
        ...this.asRecord(partial.backup),
      },
    };
  }

  private asRecord(value: unknown): JsonRecord {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as JsonRecord;
  }
}
