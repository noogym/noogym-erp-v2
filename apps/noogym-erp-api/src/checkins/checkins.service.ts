import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CheckInMethod,
  NoogymIdentityAliasType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { directGymScope } from '../common/utils/gym-scope';
import { getPagination, paginated } from '../common/utils/pagination';
import { assertActiveMember } from '../members/member-status';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateCheckinDto } from './dto/create-checkin.dto';
import { QrCheckinDto } from './dto/qr-checkin.dto';

@Injectable()
export class CheckinsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
  ) {}

  async findAll(organizationId: string, query: PaginationQueryDto) {
    const { page, limit, skip, take } = getPagination(query.page, query.limit);
    const where: Prisma.CheckInWhereInput = {
      organizationId,
      ...directGymScope(query),
      ...(query.startDate || query.endDate
        ? {
            checkedAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
      ...(query.search ? { member: { name: { contains: query.search } } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.checkIn.findMany({
        where,
        skip,
        take,
        orderBy: { checkedAt: 'desc' },
        include: { member: true, gym: true },
      }),
      this.prisma.checkIn.count({ where }),
    ]);

    return paginated(items, total, page, limit);
  }

  async today(organizationId: string, query: PaginationQueryDto) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return this.prisma.checkIn.findMany({
      where: {
        organizationId,
        ...directGymScope(query),
        checkedAt: { gte: start, lt: end },
      },
      orderBy: { checkedAt: 'desc' },
      include: { member: true, gym: true },
    });
  }

  async create(organizationId: string, dto: CreateCheckinDto) {
    const operationalSettings =
      await this.settingsService.getOperational(organizationId);
    const checkinSettings = operationalSettings.checkin;
    const checkedAt = dto.checkedAt ?? new Date();
    const checkedAtDayStart = new Date(checkedAt);
    checkedAtDayStart.setHours(0, 0, 0, 0);
    const checkedAtDayEnd = new Date(checkedAtDayStart);
    checkedAtDayEnd.setDate(checkedAtDayEnd.getDate() + 1);
    const member = await this.prisma.member.findFirst({
      where: { id: dto.memberId, organizationId },
    });

    if (!member) throw new NotFoundException('Member not found');
    assertActiveMember(member);
    this.assertCheckinMethodEnabled(dto.method, checkinSettings);
    this.assertWithinAccessWindow(checkedAt, checkinSettings);

    const dailyLimit = Number(checkinSettings.dailyLimit);
    if (Number.isFinite(dailyLimit) && dailyLimit > 0) {
      const checkinsToday = await this.prisma.checkIn.count({
        where: {
          organizationId,
          memberId: dto.memberId,
          checkedAt: { gte: checkedAtDayStart, lt: checkedAtDayEnd },
        },
      });

      if (checkinsToday >= dailyLimit) {
        throw new BadRequestException(
          `Daily check-in limit reached (${dailyLimit})`,
        );
      }
    }

    const activeSubscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        memberId: dto.memberId,
        status: SubscriptionStatus.ACTIVE,
        endDate: { gte: checkedAt },
        OR: [
          { startDate: { lte: checkedAt } },
          { startDate: { gte: checkedAtDayStart, lt: checkedAtDayEnd } },
        ],
      },
    });

    if (!activeSubscription && checkinSettings.blockExpiredPlan) {
      throw new BadRequestException(
        'Member does not have a valid active subscription',
      );
    }

    if (dto.gymId) {
      const gym = await this.prisma.gym.findFirst({
        where: { id: dto.gymId, organizationId },
        select: { id: true },
      });

      if (!gym) {
        throw new NotFoundException('Gym not found');
      }
    }

    return this.prisma.checkIn.create({
      data: {
        organizationId,
        memberId: dto.memberId,
        gymId: dto.gymId ?? member.gymId,
        method: dto.method,
        checkedAt,
        notes: dto.notes,
      },
      include: { member: true, gym: true },
    });
  }

  async createFromQr(organizationId: string, dto: QrCheckinDto) {
    const parsed = this.parseQrPayload(dto.payload);
    if (!parsed.qrToken && !parsed.accessCode) {
      throw new BadRequestException('Invalid scanner payload');
    }
    const or: Prisma.MemberWhereInput[] = [];
    if (parsed.qrToken) or.push({ qrToken: parsed.qrToken });
    if (parsed.accessCode) {
      or.push(
        { accessCode: parsed.accessCode },
        {
          noogymIdentity: {
            OR: [
              { noogymId: parsed.accessCode },
              {
                aliases: {
                  some: {
                    value: parsed.accessCode,
                    isActive: true,
                    type: {
                      in: [
                        NoogymIdentityAliasType.BARCODE,
                        NoogymIdentityAliasType.CARD,
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      );
    }

    const member = await this.prisma.member.findFirst({
      where: {
        organizationId,
        ...(parsed.memberId ? { id: parsed.memberId } : {}),
        OR: or,
      },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Scanner code not found or revoked');
    }

    return this.create(organizationId, {
      memberId: member.id,
      gymId: dto.gymId,
      method: parsed.accessCode ? CheckInMethod.BARCODE : CheckInMethod.QR_CODE,
      checkedAt: dto.checkedAt,
      notes: dto.notes ?? (parsed.accessCode ? 'Codigo de barras' : 'QR Code'),
    });
  }

  private assertCheckinMethodEnabled(
    method: CheckInMethod,
    settings: Record<string, unknown>,
  ) {
    const methodMap: Record<CheckInMethod, string> = {
      [CheckInMethod.MANUAL]: 'manual',
      [CheckInMethod.QR_CODE]: 'qrCode',
      [CheckInMethod.BARCODE]: 'qrCode',
      [CheckInMethod.BIOMETRIC]: 'biometric',
      [CheckInMethod.APP]: 'qrCode',
      [CheckInMethod.NFC]: 'turnstile',
    };
    const settingKey = methodMap[method];

    if (settings[settingKey] === false) {
      throw new BadRequestException(`Check-in method ${method} is disabled`);
    }
  }

  private assertWithinAccessWindow(
    checkedAt: Date,
    settings: Record<string, unknown>,
  ) {
    const start = this.timeToMinutes(settings.accessStart, 0);
    const end = this.timeToMinutes(settings.accessEnd, 24 * 60 - 1);
    const tolerance = Number(settings.toleranceMinutes ?? 0);
    const current = checkedAt.getHours() * 60 + checkedAt.getMinutes();
    const allowedStart = Math.max(0, start - tolerance);
    const allowedEnd = Math.min(24 * 60 - 1, end + tolerance);
    const allowed =
      allowedStart <= allowedEnd
        ? current >= allowedStart && current <= allowedEnd
        : current >= allowedStart || current <= allowedEnd;

    if (!allowed) {
      throw new BadRequestException('Check-in outside allowed access window');
    }
  }

  private timeToMinutes(value: unknown, fallback: number) {
    if (typeof value !== 'string') return fallback;
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return fallback;
    return hours * 60 + minutes;
  }

  private parseQrPayload(payload: string) {
    const raw = payload.trim();

    try {
      const parsed = JSON.parse(raw) as {
        memberId?: unknown;
        qrToken?: unknown;
        token?: unknown;
        barcode?: unknown;
        accessCode?: unknown;
        cardCode?: unknown;
        card?: unknown;
      };
      const accessCode =
        typeof parsed.barcode === 'string'
          ? parsed.barcode
          : typeof parsed.accessCode === 'string'
            ? parsed.accessCode
            : typeof parsed.cardCode === 'string'
              ? parsed.cardCode
              : typeof parsed.card === 'string'
                ? parsed.card
                : undefined;
      return {
        memberId:
          typeof parsed.memberId === 'string' ? parsed.memberId : undefined,
        qrToken:
          typeof parsed.qrToken === 'string'
            ? parsed.qrToken
            : typeof parsed.token === 'string'
              ? parsed.token
              : undefined,
        accessCode,
      };
    } catch {
      // Continue with URL/raw token parsing.
    }

    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.protocol === 'noogym:' && url.hostname === 'checkin') {
        return { memberId: parts[0], qrToken: parts[1] };
      }
      if (url.protocol === 'noogym:' && ['barcode', 'card'].includes(url.hostname)) {
        return { accessCode: parts[0] };
      }

      const checkinIndex = parts.findIndex((part) => part === 'checkin');
      if (checkinIndex >= 0) {
        return {
          memberId: parts[checkinIndex + 1],
          qrToken: parts[checkinIndex + 2],
        };
      }
      const barcodeIndex = parts.findIndex((part) =>
        ['barcode', 'card'].includes(part),
      );
      if (barcodeIndex >= 0) return { accessCode: parts[barcodeIndex + 1] };
    } catch {
      // Raw token fallback below.
    }

    return /^\d{6,}$/.test(raw) ? { accessCode: raw } : { qrToken: raw };
  }
}
