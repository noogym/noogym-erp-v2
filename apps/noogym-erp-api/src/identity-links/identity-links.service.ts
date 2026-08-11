import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MessageChannel,
  NoogymIdentityAliasType,
  Prisma,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LinkMemberIdentityDto } from './dto/link-member-identity.dto';
import { ResolveIdentityDto } from './dto/resolve-identity.dto';
import { SendInviteDto } from './dto/send-invite.dto';

type IdentityCandidate = {
  identityId?: string;
  identifier?: string;
};

type ParsedIdentifier =
  | { kind: 'value'; value: string }
  | { kind: 'qrToken'; value: string }
  | { kind: 'alias'; value: string; aliasTypes: NoogymIdentityAliasType[] };

type IdentityWithAliases = Prisma.NoogymIdentityGetPayload<{
  include: { aliases: true };
}>;

const defaultChannels = [
  MessageChannel.WHATSAPP,
  MessageChannel.SMS,
  MessageChannel.EMAIL,
];

@Injectable()
export class IdentityLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(organizationId: string, dto: ResolveIdentityDto) {
    const identity = await this.resolveIdentity({
      identifier: dto.identifier,
    });
    const existingMember = await this.findExistingMember(
      organizationId,
      identity,
    );

    return {
      identity: this.publicIdentity(identity),
      existingMember,
      canLink: !existingMember?.noogymIdentityId,
    };
  }

  async linkMember(organizationId: string, dto: LinkMemberIdentityDto) {
    const identity = await this.resolveIdentity(dto);
    await this.ensureGym(organizationId, dto.gymId);

    const existingMember = await this.findExistingMember(
      organizationId,
      identity,
    );

    if (existingMember) {
      return this.prisma.member.update({
        where: { id: existingMember.id },
        data: {
          noogymIdentityId: identity.id,
          gymId: dto.gymId ?? existingMember.gymId,
          name: existingMember.name || identity.name,
          email: existingMember.email ?? identity.email,
          phone: existingMember.phone ?? identity.phone,
          birthDate: existingMember.birthDate ?? identity.birthDate,
          gender: existingMember.gender ?? identity.gender,
          documentNumber:
            existingMember.documentNumber ?? identity.documentNumber,
          avatarUrl: existingMember.avatarUrl ?? identity.avatarUrl,
          accessCode:
            existingMember.accessCode ??
            this.preferredAliasValue(identity, NoogymIdentityAliasType.BARCODE) ??
            identity.noogymId,
        },
        include: this.memberInclude(),
      });
    }

    return this.prisma.member.create({
      data: {
        organizationId,
        gymId: dto.gymId,
        noogymIdentityId: identity.id,
        name: identity.name,
        email: identity.email,
        phone: identity.phone,
        birthDate: identity.birthDate,
        gender: identity.gender,
        documentNumber: identity.documentNumber,
        avatarUrl: identity.avatarUrl,
        accessCode:
          this.preferredAliasValue(identity, NoogymIdentityAliasType.BARCODE) ??
          identity.noogymId,
        qrToken: this.randomInviteToken(),
        qrTokenUpdatedAt: new Date(),
      },
      include: this.memberInclude(),
    });
  }

  async inviteMemberToApp(
    organizationId: string,
    memberId: string,
    dto: SendInviteDto,
  ) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId },
      include: { organization: true, gym: true },
    });

    if (!member) throw new NotFoundException('Member not found');
    if (!member.email && !member.phone) {
      throw new BadRequestException('Member needs email or phone for invite');
    }

    const channels = this.resolveChannels(dto.channels);
    const inviteUrl = this.memberInviteUrl(member.id);
    const content = [
      `Ola ${member.name}.`,
      `${member.gym?.name ?? member.organization.name} cadastrou voce no Noogym.`,
      'Baixe o app para acompanhar planos, pagamentos, treinos e check-ins.',
      inviteUrl,
    ].join(' ');

    const messages = await Promise.all(
      channels.map((channel) =>
        this.prisma.message.create({
          data: {
            organizationId,
            title: 'Convite para o app Noogym',
            content,
            channel,
            status: 'SENT',
            sentAt: new Date(),
            recipients: { create: [{ memberId: member.id }] },
          },
        }),
      ),
    );

    return {
      memberId: member.id,
      inviteUrl,
      channels,
      messages,
    };
  }

  async inviteEmployeeToAccount(
    organizationId: string,
    employeeId: string,
    dto: SendInviteDto,
  ) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      include: { user: true, gym: true, organization: true },
    });

    if (!employee) throw new NotFoundException('Employee not found');
    const email = employee.user?.email ?? employee.email;
    if (!email) throw new BadRequestException('Employee needs email');

    const user = employee.user ?? (await this.createOrInviteEmployeeUser(
      organizationId,
      employee,
      email,
    ));

    if (!employee.userId) {
      await this.prisma.employee.update({
        where: { id: employee.id },
        data: { userId: user.id },
      });
    }

    const channels = this.resolveChannels(dto.channels);
    return {
      employeeId: employee.id,
      userId: user.id,
      accountEmail: user.email,
      inviteUrl: this.employeeInviteUrl(user.id),
      channels,
      status: UserStatus.INVITED,
    };
  }

  private async resolveIdentity(
    candidate: IdentityCandidate,
  ): Promise<IdentityWithAliases> {
    const identityId = candidate.identityId?.trim();
    const parsed = this.parseIdentifier(candidate.identifier ?? identityId);
    const value = parsed.value;

    if (!identityId && !value) {
      throw new BadRequestException('Identity identifier is required');
    }

    const aliasTypes: NoogymIdentityAliasType[] =
      parsed.kind === 'alias' ? parsed.aliasTypes : this.defaultAliasTypes(value);
    const or: Prisma.NoogymIdentityWhereInput[] = [];
    if (identityId) or.push({ id: identityId });
    if (parsed.kind === 'qrToken') or.push({ qrToken: value });
    if (value) {
      or.push({
        aliases: {
          some: {
            value,
            isActive: true,
            type: { in: aliasTypes },
          },
        },
      });
    }
    or.push(
      { noogymId: value },
      { email: value.toLowerCase() },
      { phone: value },
      { documentNumber: value.toUpperCase() },
    );

    const identity = await this.prisma.noogymIdentity.findFirst({
      where: { OR: or },
      include: { aliases: true },
    });

    if (!identity) throw new NotFoundException('Noogym identity not found');
    const matchedAlias = identity.aliases.find(
      (alias) => alias.value === value && alias.isActive,
    );
    if (this.isExpiredIdentityCredential(identity, matchedAlias, parsed.kind)) {
      throw new BadRequestException('Noogym identity credential expired');
    }

    return identity;
  }

  private parseIdentifier(identifier?: string): ParsedIdentifier {
    const raw = identifier?.trim() ?? '';
    if (!raw) return { kind: 'value', value: '' };

    try {
      const parsed = JSON.parse(raw) as {
        noogymId?: unknown;
        identityId?: unknown;
        qrToken?: unknown;
        token?: unknown;
        barcode?: unknown;
        accessCode?: unknown;
        cardCode?: unknown;
        card?: unknown;
      };
      const noogymId =
        typeof parsed.noogymId === 'string' ? parsed.noogymId : undefined;
      const identityId =
        typeof parsed.identityId === 'string' ? parsed.identityId : undefined;
      const qrToken =
        typeof parsed.qrToken === 'string'
          ? parsed.qrToken
          : typeof parsed.token === 'string'
            ? parsed.token
            : undefined;
      const barcode =
        typeof parsed.barcode === 'string'
          ? parsed.barcode
          : typeof parsed.accessCode === 'string'
            ? parsed.accessCode
            : undefined;
      const card =
        typeof parsed.cardCode === 'string'
          ? parsed.cardCode
          : typeof parsed.card === 'string'
            ? parsed.card
            : undefined;
      if (qrToken) return { kind: 'qrToken', value: qrToken.trim() };
      if (barcode) {
        return {
          kind: 'alias',
          value: barcode.trim(),
          aliasTypes: [NoogymIdentityAliasType.BARCODE],
        };
      }
      if (card) {
        return {
          kind: 'alias',
          value: card.trim(),
          aliasTypes: [NoogymIdentityAliasType.CARD],
        };
      }
      if (noogymId) return { kind: 'value', value: noogymId.trim() };
      if (identityId) return { kind: 'value', value: identityId.trim() };
    } catch {
      // Continue with URL/raw parsing.
    }

    try {
      const url = new URL(raw);
      const parts = url.pathname.split('/').filter(Boolean);
      const token = parts.at(-1);
      if (url.protocol === 'noogym:' && token) {
        if (parts.includes('barcode')) {
          return {
            kind: 'alias',
            value: token,
            aliasTypes: [NoogymIdentityAliasType.BARCODE],
          };
        }
        if (parts.includes('card')) {
          return {
            kind: 'alias',
            value: token,
            aliasTypes: [NoogymIdentityAliasType.CARD],
          };
        }
        return { kind: 'qrToken', value: token };
      }
    } catch {
      // Raw value fallback below.
    }

    return { kind: 'value', value: raw };
  }

  private async findExistingMember(
    organizationId: string,
    identity: {
      id: string;
      email: string | null;
      phone: string | null;
      documentNumber: string | null;
    },
  ) {
    return this.prisma.member.findFirst({
      where: {
        organizationId,
        OR: [
          { noogymIdentityId: identity.id },
          ...(identity.email ? [{ email: identity.email }] : []),
          ...(identity.phone ? [{ phone: identity.phone }] : []),
          ...(identity.documentNumber
            ? [{ documentNumber: identity.documentNumber }]
            : []),
        ],
      },
      include: this.memberInclude(),
    });
  }

  private async ensureGym(organizationId: string, gymId?: string) {
    if (!gymId) return;
    const gym = await this.prisma.gym.findFirst({
      where: { id: gymId, organizationId },
      select: { id: true },
    });
    if (!gym) throw new NotFoundException('Gym not found');
  }

  private memberInclude() {
    return {
      gym: true,
      noogymIdentity: { include: { aliases: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' as const },
        take: 1,
        include: { plan: true },
      },
      checkIns: { orderBy: { checkedAt: 'desc' as const }, take: 1 },
    };
  }

  private publicIdentity(identity: {
    id: string;
    noogymId: string;
    name: string;
    email: string | null;
    phone: string | null;
    birthDate: Date | null;
    gender: string;
    documentNumber: string | null;
    avatarUrl: string | null;
    aliases?: Array<{
      type: NoogymIdentityAliasType;
      value: string;
      label: string | null;
      isActive: boolean;
      expiresAt: Date | null;
    }>;
  }) {
    return {
      id: identity.id,
      noogymId: identity.noogymId,
      name: identity.name,
      email: identity.email,
      phone: identity.phone,
      birthDate: identity.birthDate,
      gender: identity.gender,
      documentNumber: identity.documentNumber,
      avatarUrl: identity.avatarUrl,
      aliases: identity.aliases
        ?.filter((alias) => alias.isActive)
        .map((alias) => ({
          type: alias.type,
          value: alias.value,
          label: alias.label,
          expiresAt: alias.expiresAt,
        })) ?? [],
    };
  }

  private defaultAliasTypes(value: string): NoogymIdentityAliasType[] {
    return [
      NoogymIdentityAliasType.NOOGYM_ID,
      NoogymIdentityAliasType.QR_TOKEN,
      NoogymIdentityAliasType.BARCODE,
      NoogymIdentityAliasType.CARD,
    ].filter((type) =>
      value.startsWith('NG-') ? true : type !== NoogymIdentityAliasType.NOOGYM_ID,
    );
  }

  private isExpiredIdentityCredential(
    identity: {
      qrToken: string | null;
      qrTokenExpiresAt: Date | null;
    },
    alias:
      | {
          type: NoogymIdentityAliasType;
          expiresAt: Date | null;
        }
      | undefined,
    parsedKind: string,
  ) {
    const now = new Date();
    if (alias?.expiresAt && alias.expiresAt < now) return true;
    return Boolean(
      parsedKind === 'qrToken' &&
        identity.qrToken &&
        identity.qrTokenExpiresAt &&
        identity.qrTokenExpiresAt < now,
    );
  }

  private preferredAliasValue(
    identity: {
      aliases?: Array<{
        type: NoogymIdentityAliasType;
        value: string;
        isActive: boolean;
        expiresAt: Date | null;
      }>;
    },
    type: NoogymIdentityAliasType,
  ) {
    const now = new Date();
    return identity.aliases?.find(
      (alias) =>
        alias.type === type &&
        alias.isActive &&
        (!alias.expiresAt || alias.expiresAt >= now),
    )?.value;
  }

  private resolveChannels(channels?: MessageChannel[]) {
    const unique = [...new Set(channels?.length ? channels : defaultChannels)];
    return unique.filter((channel) => channel !== MessageChannel.PUSH);
  }

  private async createOrInviteEmployeeUser(
    organizationId: string,
    employee: {
      name: string;
      phone: string | null;
      role: string;
    },
    email: string,
  ) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing && existing.organizationId !== organizationId) {
      throw new BadRequestException(
        'This email already belongs to another organization',
      );
    }

    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: {
          name: employee.name,
          phone: employee.phone,
          status: UserStatus.INVITED,
        },
      });
    }

    return this.prisma.user.create({
      data: {
        organizationId,
        name: employee.name,
        email,
        phone: employee.phone,
        role: this.employeeRoleToUserRole(employee.role),
        status: UserStatus.INVITED,
      },
    });
  }

  private employeeRoleToUserRole(role: string) {
    const normalized = role
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('gerente')) return UserRole.MANAGER;
    if (normalized.includes('recep')) return UserRole.RECEPTIONIST;
    if (normalized.includes('financ')) return UserRole.FINANCE;
    if (normalized.includes('personal') || normalized.includes('trein')) {
      return UserRole.TRAINER;
    }
    return UserRole.RECEPTIONIST;
  }

  private memberInviteUrl(memberId: string) {
    return `https://app.noogym.com/convite/aluno/${memberId}`;
  }

  private employeeInviteUrl(userId: string) {
    return `https://admin.noogym.com/convite/funcionario/${userId}`;
  }

  private randomInviteToken() {
    return `invite-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}
