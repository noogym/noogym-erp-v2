import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type PasswordResetEmail = {
  name: string;
  resetUrl: string;
  to: string;
};

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendPasswordResetEmail(email: PasswordResetEmail) {
    if (!this.isSmtpConfigured()) {
      this.logFallback(email.resetUrl);
      return false;
    }

    const transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.isSmtpSecure(),
      auth: this.smtpAuth(),
    });

    await transport.sendMail({
      from: this.config.get<string>('SMTP_FROM'),
      to: email.to,
      subject: 'Recuperacao de senha Noogym',
      text: [
        `Ola ${email.name},`,
        '',
        'Recebemos um pedido para redefinir a senha da sua conta Noogym.',
        `Use este link para criar uma nova senha: ${email.resetUrl}`,
        '',
        'Se nao foi voce, ignore esta mensagem.',
      ].join('\n'),
      html: `
        <p>Ola ${this.escapeHtml(email.name)},</p>
        <p>Recebemos um pedido para redefinir a senha da sua conta Noogym.</p>
        <p><a href="${this.escapeHtml(email.resetUrl)}">Criar nova senha</a></p>
        <p>Se nao foi voce, ignore esta mensagem.</p>
      `,
    });

    return true;
  }

  private isSmtpConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') &&
        this.config.get<string>('SMTP_FROM'),
    );
  }

  private isSmtpSecure() {
    const secure = this.config.get<string>('SMTP_SECURE');
    if (secure !== undefined) return secure.toLowerCase() === 'true';

    return Number(this.config.get<string>('SMTP_PORT', '587')) === 465;
  }

  private smtpAuth() {
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    return user && pass ? { user, pass } : undefined;
  }

  private logFallback(resetUrl: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error(
        'SMTP is not configured. Password reset email was not sent.',
      );
      return;
    }

    this.logger.warn(`SMTP is not configured. Password reset URL: ${resetUrl}`);
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
