import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

type AuthUserWithRelations = {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  refreshTokenHash?: string | null;
  organization?: {
    name: string;
  };
  employeeProfile?: {
    role: string;
    status: string;
  } | null;
  gyms?: Array<{
    gym: {
      id: string;
      name: string;
    };
  }>;
};

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
};

type RefreshJwtPayload = JwtPayload & {
  type?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.organizationSlug },
    });

    if (existingOrg) {
      throw new BadRequestException('Organization slug already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.organizationName,
          slug: dto.organizationSlug,
        },
      });

      return tx.user.create({
        data: {
          organizationId: organization.id,
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          passwordHash,
          role: 'OWNER',
        },
        include: {
          organization: true,
          employeeProfile: true,
          gyms: { include: { gym: true } },
        },
      });
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        organization: true,
        employeeProfile: true,
        gyms: { include: { gym: true } },
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isValidPassword || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.buildAuthResponse(user);
  }

  async me(userId: string, organizationId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        organization: true,
        employeeProfile: {
          select: {
            role: true,
            status: true,
          },
        },
        gyms: {
          include: {
            gym: true,
          },
        },
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    return {
      message:
        'If this email is registered, password recovery instructions will be sent.',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, organizationId: payload.organizationId },
      include: {
        organization: true,
        employeeProfile: true,
        gyms: { include: { gym: true } },
      },
    });

    if (
      !user?.refreshTokenHash ||
      user.status !== UserStatus.ACTIVE ||
      !(await bcrypt.compare(dto.refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthResponse(user);
  }

  async logout(dto: RefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refreshToken);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, organizationId: payload.organizationId },
      select: { id: true, refreshTokenHash: true },
    });

    if (
      !user?.refreshTokenHash ||
      !(await bcrypt.compare(dto.refreshToken, user.refreshTokenHash))
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: null },
    });

    return { message: 'Logged out successfully' };
  }

  private async buildAuthResponse(user: AuthUserWithRelations) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.signRefreshToken(payload);
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeRole: user.employeeProfile?.role,
        gyms: user.gyms?.map((item) => ({
          id: item.gym.id,
          name: item.gym.name,
        })),
        organizationId: user.organizationId,
        organizationName: user.organization?.name,
      },
    };
  }

  private async verifyRefreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshJwtPayload>(
        refreshToken,
        { secret: this.getRefreshTokenSecret() },
      );

      if (
        payload.type !== 'refresh' ||
        !payload.sub ||
        !payload.email ||
        !payload.role ||
        !payload.organizationId
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private signRefreshToken(payload: JwtPayload) {
    return this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.getRefreshTokenSecret(),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as JwtSignOptions['expiresIn'],
      },
    );
  }

  private getRefreshTokenSecret() {
    return (
      this.config.get<string>('JWT_REFRESH_SECRET') ??
      this.config.get<string>('JWT_SECRET') ??
      'noogym-dev-secret'
    );
  }
}
