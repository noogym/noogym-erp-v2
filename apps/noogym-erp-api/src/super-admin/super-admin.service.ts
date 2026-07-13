import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AuthService } from '../auth/auth.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupportSessionDto } from './dto/create-support-session.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async overview() {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        gyms: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            province: true,
            country: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: {
                members: true,
                users: true,
                products: true,
                sales: true,
                gymClasses: true,
                employees: true,
              },
            },
          },
        },
        users: {
          orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
            gyms: {
              select: {
                gym: { select: { id: true, name: true } },
              },
            },
          },
        },
        _count: {
          select: {
            gyms: true,
            users: true,
            members: true,
            plans: true,
            products: true,
            sales: true,
            employees: true,
            subscriptions: true,
            payments: true,
            checkIns: true,
          },
        },
      },
    });

    const totals = organizations.reduce(
      (acc, organization) => ({
        organizations: acc.organizations + 1,
        gyms: acc.gyms + organization._count.gyms,
        users: acc.users + organization._count.users,
        members: acc.members + organization._count.members,
        plans: acc.plans + organization._count.plans,
        products: acc.products + organization._count.products,
        sales: acc.sales + organization._count.sales,
      }),
      {
        organizations: 0,
        gyms: 0,
        users: 0,
        members: 0,
        plans: 0,
        products: 0,
        sales: 0,
      },
    );

    return {
      totals,
      organizations: organizations.map((organization) => ({
        ...organization,
        users: organization.users.map((user) => ({
          ...user,
          gyms: user.gyms.map((item) => item.gym),
        })),
      })),
    };
  }

  async sendPasswordReset(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, organization: { select: { name: true } } },
    });

    if (!user) throw new NotFoundException('User not found');

    const result = await this.authService.forgotPassword({ email: user.email });

    return {
      message: 'Password reset requested',
      user: {
        email: user.email,
        name: user.name,
        organizationName: user.organization.name,
      },
      resetUrl: result.resetUrl,
    };
  }

  async createSupportSession(actor: AuthUser, dto: CreateSupportSessionDto) {
    const [targetOrganization, actorUser] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
        select: {
          id: true,
          name: true,
          gyms: {
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.user.findUnique({
        where: { id: actor.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
        },
      }),
    ]);

    if (!targetOrganization) {
      throw new NotFoundException('Organization not found');
    }
    if (!actorUser) {
      throw new NotFoundException('Super admin user not found');
    }

    const supportSessionId = randomUUID();
    const reason = dto.reason.trim();

    await this.prisma.auditLog.create({
      data: {
        organizationId: targetOrganization.id,
        userId: actor.sub,
        action: 'SUPPORT_SESSION_START',
        entity: 'support-sessions',
        entityId: supportSessionId,
        metadata: {
          reason,
          actorEmail: actor.email,
          actorOrganizationId: actor.organizationId,
          targetOrganizationId: targetOrganization.id,
          targetOrganizationName: targetOrganization.name,
        },
      },
    });

    return this.authService.buildSupportAuthResponse({
      actor: actorUser,
      targetOrganization,
      gyms: targetOrganization.gyms,
      reason,
      supportSessionId,
    });
  }

  async endSupportSession(user: AuthUser) {
    if (!user.supportMode || !user.supportSessionId) {
      return { message: 'No active support session' };
    }

    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.supportActorId ?? user.sub,
        action: 'SUPPORT_SESSION_END',
        entity: 'support-sessions',
        entityId: user.supportSessionId,
        metadata: {
          reason: user.supportReason,
          actorEmail: user.supportActorEmail ?? user.email,
          targetOrganizationId: user.organizationId,
        },
      },
    });

    return { message: 'Support session ended' };
  }
}
