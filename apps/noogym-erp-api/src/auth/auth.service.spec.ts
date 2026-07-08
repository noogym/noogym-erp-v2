import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

describe('AuthService refresh tokens', () => {
  const refreshToken = 'old-refresh-token';
  const payload = {
    sub: 'user-1',
    email: 'admin@noogym.com',
    role: UserRole.OWNER,
    organizationId: 'org-1',
    type: 'refresh',
  };

  function createService() {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      organization: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const jwtService = {
      sign: jest.fn((tokenPayload: { type?: string }) =>
        tokenPayload.type === 'refresh'
          ? 'rotated-refresh-token'
          : 'new-access-token',
      ),
      verifyAsync: jest.fn().mockResolvedValue(payload),
    };
    const config = {
      get: jest.fn((key: string, fallback?: string) => {
        const values: Record<string, string> = {
          JWT_SECRET: 'access-secret',
          JWT_REFRESH_SECRET: 'refresh-secret',
          JWT_REFRESH_EXPIRES_IN: '7d',
        };
        return values[key] ?? fallback;
      }),
    };
    const passwordResetEmail = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };

    return {
      prisma,
      jwtService,
      config,
      passwordResetEmail,
      service: new AuthService(
        prisma as any,
        jwtService as any,
        config as any,
        passwordResetEmail as any,
      ),
    };
  }

  async function activeUser(refreshTokenHash: string) {
    return {
      id: 'user-1',
      email: 'admin@noogym.com',
      name: 'Admin',
      role: UserRole.OWNER,
      status: UserStatus.ACTIVE,
      organizationId: 'org-1',
      refreshTokenHash,
      organization: { name: 'Noogym' },
      employeeProfile: null,
      gyms: [],
    };
  }

  it('rotates refresh token and stores only the new hash', async () => {
    const { prisma, jwtService, service } = createService();
    prisma.user.findFirst.mockResolvedValue(
      await activeUser(await bcrypt.hash(refreshToken, 4)),
    );
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    const response = await service.refresh({ refreshToken });

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken, {
      secret: 'refresh-secret',
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { id: 'user-1', organizationId: 'org-1' },
      include: {
        organization: true,
        employeeProfile: true,
        gyms: { include: { gym: true } },
      },
    });
    expect(response).toEqual(
      expect.objectContaining({
        accessToken: 'new-access-token',
        refreshToken: 'rotated-refresh-token',
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshTokenHash: expect.any(String) },
    });
    const storedHash =
      prisma.user.update.mock.calls[0][0].data.refreshTokenHash;
    expect(storedHash).not.toBe('rotated-refresh-token');
    await expect(
      bcrypt.compare('rotated-refresh-token', storedHash),
    ).resolves.toBe(true);
  });

  it('rejects a reused refresh token after rotation', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue(
      await activeUser(await bcrypt.hash('newer-refresh-token', 4)),
    );

    await expect(service.refresh({ refreshToken })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('revokes refresh token on logout', async () => {
    const { prisma, service } = createService();
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      refreshTokenHash: await bcrypt.hash(refreshToken, 4),
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    await expect(service.logout({ refreshToken })).resolves.toEqual({
      message: 'Logged out successfully',
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { refreshTokenHash: null },
    });
  });

  it('rejects tokens without refresh payload type', async () => {
    const { jwtService, service } = createService();
    jwtService.verifyAsync.mockResolvedValue({ ...payload, type: 'access' });

    await expect(service.refresh({ refreshToken })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('creates a password reset token and sends the recovery link', async () => {
    const { passwordResetEmail, prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@noogym.com',
      name: 'Admin',
      status: UserStatus.ACTIVE,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    const response = await service.forgotPassword({
      email: 'admin@noogym.com',
    });

    expect(response.message).toBe(
      'If this email is registered, password recovery instructions will be sent.',
    );
    expect(response.resetUrl).toContain('/reset-password?');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordResetTokenHash: expect.any(String),
        passwordResetTokenExpiresAt: expect.any(Date),
      },
    });
    expect(
      prisma.user.update.mock.calls[0][0].data.passwordResetTokenHash,
    ).not.toContain('reset-password');
    expect(passwordResetEmail.sendPasswordResetEmail).toHaveBeenCalledWith({
      to: 'admin@noogym.com',
      name: 'Admin',
      resetUrl: response.resetUrl,
    });
  });

  it('resets password with a valid reset token and revokes sessions', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      email: 'admin@noogym.com',
      name: 'Admin',
      status: UserStatus.ACTIVE,
    });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });

    const response = await service.forgotPassword({
      email: 'admin@noogym.com',
    });
    const token = new URL(response.resetUrl as string).searchParams.get(
      'token',
    ) as string;
    const passwordResetTokenHash =
      prisma.user.update.mock.calls[0][0].data.passwordResetTokenHash;

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      passwordResetTokenHash,
      passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.resetPassword({
        email: 'admin@noogym.com',
        token,
        password: 'NovaSenha123',
      }),
    ).resolves.toEqual({ message: 'Password reset successfully' });

    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: 'user-1' },
      data: {
        passwordHash: expect.any(String),
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetTokenExpiresAt: null,
      },
    });
    const storedPasswordHash =
      prisma.user.update.mock.calls[1][0].data.passwordHash;
    await expect(bcrypt.compare('NovaSenha123', storedPasswordHash)).resolves.toBe(
      true,
    );
  });

  it('rejects invalid or expired reset tokens', async () => {
    const { prisma, service } = createService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: UserStatus.ACTIVE,
      passwordResetTokenHash:
        '0000000000000000000000000000000000000000000000000000000000000000',
      passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
    });

    await expect(
      service.resetPassword({
        email: 'admin@noogym.com',
        token: 'invalid-reset-token-invalid-reset-token',
        password: 'NovaSenha123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
