import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JwtSignOptions } from '@nestjs/jwt';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetEmailService } from './password-reset-email.service';

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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly passwordResetEmail: PasswordResetEmailService,
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
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim() },
      select: { id: true, email: true, name: true, status: true },
    });

    const response: { message: string; resetUrl?: string } = {
      message:
        'If this email is registered, password recovery instructions will be sent.',
    };

    if (!user || user.status !== UserStatus.ACTIVE) {
      return response;
    }

    const token = this.generatePasswordResetToken();
    const resetUrl = this.buildPasswordResetUrl(user.email, token);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetTokenHash: this.hashPasswordResetToken(token),
        passwordResetTokenExpiresAt: this.passwordResetExpiresAt(),
      },
    });

    try {
      await this.passwordResetEmail.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    } catch (error) {
      this.logger.error(
        'Password reset email could not be sent.',
        error instanceof Error ? error.stack : undefined,
      );
    }

    if (this.shouldExposePasswordResetUrl()) {
      response.resetUrl = resetUrl;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim() },
      select: {
        id: true,
        status: true,
        passwordResetTokenHash: true,
        passwordResetTokenExpiresAt: true,
      },
    });

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.passwordResetTokenHash ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt <= new Date() ||
      !this.isPasswordResetTokenValid(dto.token, user.passwordResetTokenHash)
    ) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully' };
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

  private generatePasswordResetToken() {
    return randomBytes(32).toString('base64url');
  }

  private hashPasswordResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private isPasswordResetTokenValid(token: string, tokenHash: string) {
    const candidateHash = this.hashPasswordResetToken(token);
    const candidate = Buffer.from(candidateHash, 'hex');
    const stored = Buffer.from(tokenHash, 'hex');

    return (
      candidate.length === stored.length && timingSafeEqual(candidate, stored)
    );
  }

  private passwordResetExpiresAt() {
    const ttlMinutes = Number(
      this.config.get<string>('PASSWORD_RESET_TTL_MINUTES', '30'),
    );

    return new Date(Date.now() + ttlMinutes * 60 * 1000);
  }

  private buildPasswordResetUrl(email: string, token: string) {
    const baseUrl = this.config.get<string>(
      'PASSWORD_RESET_BASE_URL',
      'http://localhost:3000',
    );
    const url = new URL('/reset-password', baseUrl);
    url.searchParams.set('email', email);
    url.searchParams.set('token', token);

    return url.toString();
  }

  private shouldExposePasswordResetUrl() {
    if (this.config.get<string>('NODE_ENV') === 'production') return false;

    return (
      this.config.get<string>('PASSWORD_RESET_EXPOSE_TOKEN', 'true') !== 'false'
    );
  }
}
