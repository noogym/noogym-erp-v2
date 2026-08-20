import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

type EmailProvider = 'auto' | 'resend' | 'smtp';

export type SendEmailInput = {
  html?: string;
  subject: string;
  text?: string;
  to: string | string[];
};

export type SendEmailResult = {
  provider?: Exclude<EmailProvider, 'auto'>;
  providerMessageId?: string;
  sent: boolean;
};

@Injectable()
export class EmailDeliveryService {
  private readonly logger = new Logger(EmailDeliveryService.name);

  constructor(private readonly config: ConfigService) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const providers = this.resolveProviders();

    for (const provider of providers) {
      if (provider === 'resend' && this.isResendConfigured()) {
        try {
          const providerMessageId = await this.sendWithResend(input);
          return { provider, providerMessageId, sent: true };
        } catch (error) {
          this.logProviderError(provider, error);
        }
      }

      if (provider === 'smtp' && this.isSmtpConfigured()) {
        try {
          const providerMessageId = await this.sendWithSmtp(input);
          return { provider, providerMessageId, sent: true };
        } catch (error) {
          this.logProviderError(provider, error);
        }
      }
    }

    return { sent: false };
  }

  isConfigured() {
    return this.isResendConfigured() || this.isSmtpConfigured();
  }

  private async sendWithResend(input: SendEmailInput) {
    const resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    const { data, error } = await resend.emails.send({
      from: this.getFromAddress('resend'),
      to: this.normalizeRecipients(input.to),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    if (error) {
      throw new Error(
        `Resend rejected email: ${error.name ?? 'Error'} ${error.message}`,
      );
    }

    return data?.id;
  }

  private async sendWithSmtp(input: SendEmailInput) {
    const transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.isSmtpSecure(),
      auth: this.smtpAuth(),
    });

    const info = await transport.sendMail({
      from: this.getFromAddress('smtp'),
      to: this.normalizeRecipients(input.to),
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    return typeof info.messageId === 'string' ? info.messageId : undefined;
  }

  private resolveProviders(): Array<Exclude<EmailProvider, 'auto'>> {
    const provider = this.config
      .get<string>('EMAIL_PROVIDER', 'auto')
      .toLowerCase() as EmailProvider;

    if (provider === 'resend') return ['resend'];
    if (provider === 'smtp') return ['smtp'];

    return ['resend', 'smtp'];
  }

  private isResendConfigured() {
    return Boolean(
      this.config.get<string>('RESEND_API_KEY') &&
      this.getFromAddress('resend'),
    );
  }

  private isSmtpConfigured() {
    return Boolean(
      this.config.get<string>('SMTP_HOST') && this.getFromAddress('smtp'),
    );
  }

  private getFromAddress(provider: Exclude<EmailProvider, 'auto'>) {
    if (provider === 'resend') {
      return (
        this.config.get<string>('RESEND_FROM') ??
        this.config.get<string>('SMTP_FROM')
      );
    }

    return this.config.get<string>('SMTP_FROM');
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

  private normalizeRecipients(to: string | string[]) {
    return Array.isArray(to) ? to : [to];
  }

  private logProviderError(provider: string, error: unknown) {
    this.logger.error(
      `${provider} email delivery failed.`,
      error instanceof Error ? error.stack : undefined,
    );
  }
}
