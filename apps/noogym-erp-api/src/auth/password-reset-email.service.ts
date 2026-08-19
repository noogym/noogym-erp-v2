import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailQueueService } from '../common/email/email-queue.service';
import { EmailTemplateService } from '../common/email/email-template.service';

type PasswordResetEmail = {
  name: string;
  resetUrl: string;
  to: string;
};

@Injectable()
export class PasswordResetEmailService {
  private readonly logger = new Logger(PasswordResetEmailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly emailQueue: EmailQueueService,
    private readonly emailTemplate: EmailTemplateService,
  ) {}

  async sendPasswordResetEmail(email: PasswordResetEmail) {
    const result = await this.emailQueue.queueEmail({
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
      html: this.emailTemplate.render({
        button: { label: 'Criar nova senha', url: email.resetUrl },
        details: [{ label: 'Validade', value: 'Este link expira em breve.' }],
        eyebrow: 'Seguranca da conta',
        footerNote:
          'Se voce nao solicitou esta recuperacao, pode ignorar esta mensagem com seguranca.',
        greeting: `Ola, ${email.name}`,
        intro: [
          'Recebemos um pedido para redefinir a senha da sua conta Noogym.',
          'Use o botao abaixo para criar uma nova senha e continuar a aceder ao seu painel.',
        ],
        preheader: 'Use o link seguro para redefinir a sua senha Noogym.',
        secondary:
          'Por seguranca, nunca partilhe este link com outras pessoas.',
        title: 'Redefina a sua senha',
      }),
    });

    if (!result.sent && !result.queued) {
      this.logFallback(email.resetUrl);
    }

    return result.sent || result.queued;
  }

  private logFallback(resetUrl: string) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.error(
        'Email delivery is not configured or failed. Password reset email was not sent.',
      );
      return;
    }

    this.logger.warn(
      `Email delivery is not configured or failed. Password reset URL: ${resetUrl}`,
    );
  }
}
