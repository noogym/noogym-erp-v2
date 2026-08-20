import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type EmailButton = {
  label: string;
  url: string;
};

type EmailDetail = {
  label: string;
  value: string;
};

export type BrandedEmailInput = {
  button?: EmailButton;
  details?: EmailDetail[];
  eyebrow?: string;
  footerNote?: string;
  greeting?: string;
  intro: string[];
  preheader: string;
  secondary?: string;
  title: string;
};

@Injectable()
export class EmailTemplateService {
  constructor(private readonly config: ConfigService) {}

  render(input: BrandedEmailInput) {
    const siteUrl = this.config.get<string>(
      'EMAIL_SITE_URL',
      'https://noogym.com',
    );
    const supportUrl = this.config.get<string>(
      'EMAIL_SUPPORT_URL',
      `${siteUrl}/suporte`,
    );
    const privacyUrl = this.config.get<string>(
      'EMAIL_PRIVACY_URL',
      `${siteUrl}/privacidade`,
    );
    const termsUrl = this.config.get<string>(
      'EMAIL_TERMS_URL',
      `${siteUrl}/termos`,
    );
    const logoUrl =
      this.optionalConfig('EMAIL_LOGO_URL') ??
      `${this.config
        .get<string>('PASSWORD_RESET_BASE_URL', 'http://localhost:3000')
        .replace(/\/+$/, '')}/noogym-email-logo.png`;

    const intro = input.intro
      .map(
        (paragraph) =>
          `<p style="margin:0 0 14px;color:#cfcfcf;font-size:16px;line-height:1.65;">${this.escapeHtml(paragraph).replace(/\r?\n/g, '<br>')}</p>`,
      )
      .join('');
    const details = input.details?.length
      ? `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0;border:1px solid #2c2c2c;border-radius:14px;background:#0b0b0b;">
          ${input.details
            .map(
              (detail, index) => `
                <tr>
                  <td style="padding:${index === 0 ? '18px' : '14px'} 18px 6px;color:#8f8f8f;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">${this.escapeHtml(detail.label)}</td>
                </tr>
                <tr>
                  <td style="padding:0 18px 16px;color:#ffffff;font-size:16px;line-height:1.5;border-bottom:${index === input.details!.length - 1 ? '0' : '1px solid #202020'};">${this.escapeHtml(detail.value)}</td>
                </tr>
              `,
            )
            .join('')}
        </table>
      `
      : '';
    const button = input.button
      ? `
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:30px auto 18px;">
          <tr>
            <td align="center" bgcolor="#b6ff00" style="border-radius:12px;">
              <a href="${this.escapeHtml(input.button.url)}" style="display:inline-block;padding:16px 34px;color:#050505;font-size:14px;font-weight:800;letter-spacing:.04em;text-decoration:none;text-transform:uppercase;">${this.escapeHtml(input.button.label)}</a>
            </td>
          </tr>
        </table>
        <p style="margin:0 0 24px;color:#8e8e8e;font-size:12px;line-height:1.6;text-align:center;">Se o botao nao abrir, copie este link:<br><a href="${this.escapeHtml(input.button.url)}" style="color:#b6ff00;text-decoration:none;word-break:break-all;">${this.escapeHtml(input.button.url)}</a></p>
      `
      : '';

    return `
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>${this.escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#050505;color:#ffffff;font-family:Inter,Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${this.escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;">
            <tr>
              <td style="padding:0 16px 18px;color:#d9d9d9;font-size:14px;">
                <span style="color:#b6ff00;font-weight:800;">Noogym</span>
                <span style="color:#555555;padding:0 12px;">|</span>
                <span>O fitness conectado.</span>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #2a2a2a;border-radius:16px;background:#070707;padding:0;overflow:hidden;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="padding:44px 28px 24px;">
                      ${
                        logoUrl
                          ? `<img src="${this.escapeHtml(logoUrl)}" width="126" alt="Noogym" style="display:block;border:0;outline:none;text-decoration:none;max-width:126px;height:auto;">`
                          : `<div style="color:#b6ff00;font-size:15px;font-weight:900;letter-spacing:.42em;text-indent:.42em;">NOOGYM</div>`
                      }
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 20px 26px;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:18px;background:#111111;border:1px solid #1d1d1d;">
                        <tr>
                          <td style="padding:42px 40px;">
                            ${input.eyebrow ? `<p style="margin:0 0 18px;color:#b6ff00;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;">${this.escapeHtml(input.eyebrow)}</p>` : ''}
                            ${input.greeting ? `<p style="margin:0 0 18px;color:#ffffff;font-size:16px;font-weight:700;">${this.escapeHtml(input.greeting)}</p>` : ''}
                            <h1 style="margin:0 0 20px;color:#ffffff;font-size:38px;line-height:1.12;font-weight:900;letter-spacing:0;">${this.escapeHtml(input.title)}</h1>
                            ${intro}
                            ${details}
                            ${button}
                            ${input.secondary ? `<p style="margin:22px 0 0;color:#a8a8a8;font-size:14px;line-height:1.65;">${this.escapeHtml(input.secondary)}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:30px 30px 10px;border-top:1px solid #b6ff00;">
                      <div style="color:#ffffff;font-size:13px;font-weight:900;letter-spacing:.42em;text-indent:.42em;">NOOGYM</div>
                      <p style="margin:10px 0 22px;color:#a5a5a5;font-size:14px;">O fitness conectado.</p>
                      <p style="margin:0 0 22px;color:#b6ff00;font-size:13px;">
                        <a href="${this.escapeHtml(siteUrl)}" style="color:#b6ff00;text-decoration:none;">Site Oficial</a>
                        <span style="color:#555555;padding:0 10px;">|</span>
                        <a href="${this.escapeHtml(supportUrl)}" style="color:#b6ff00;text-decoration:none;">Suporte</a>
                        <span style="color:#555555;padding:0 10px;">|</span>
                        <a href="${this.escapeHtml(privacyUrl)}" style="color:#b6ff00;text-decoration:none;">Privacidade</a>
                        <span style="color:#555555;padding:0 10px;">|</span>
                        <a href="${this.escapeHtml(termsUrl)}" style="color:#b6ff00;text-decoration:none;">Termos</a>
                      </p>
                      <p style="margin:0 0 28px;color:#898989;font-size:12px;line-height:1.6;">${this.escapeHtml(input.footerNote ?? 'Mensagem automatica enviada pelo ecossistema Noogym.')}<br>&copy; 2026 Noogym. Todos os direitos reservados.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private optionalConfig(key: string) {
    const value = this.config.get<string>(key)?.trim();
    return value || undefined;
  }
}
