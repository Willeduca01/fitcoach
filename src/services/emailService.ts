import {
  InviteEmailData,
  generateInviteEmailHtml,
  generatePasswordResetEmailHtml,
  PasswordResetEmailData,
} from '../lib/emailTemplates';
import { checkRateLimit, recordAttempt, formatSecondsToTime } from '../lib/rateLimiter';

import { isValidEmail, sanitizeHeader } from '../lib/security';

export interface SendInviteResult {
  success: boolean;
  messageId?: string;
  error?: string;
  resendDomainRestriction?: boolean;
}

/**
 * Dispara o e-mail de convite para a API segura (Resend) com proteção de Rate Limit
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<SendInviteResult> {
  const cleanEmail = (data.toEmail || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      error: 'Endereço de e-mail inválido ou malformado.',
    };
  }

  // Verificação de Rate Limit para prevenir spam de disparos
  const rateCheck = checkRateLimit('EMAIL_SEND', cleanEmail);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Limite de envios atingido. Por segurança, aguarde ${formatSecondsToTime(rateCheck.lockoutSeconds)} antes de reenviar para este destinatário.`,
    };
  }

  const { subject, html } = generateInviteEmailHtml(data);

  try {
    const payload = JSON.stringify({
      to: data.toEmail,
      subject,
      html,
      inviteCode: data.inviteCode,
      role: data.role,
    });

    // Tenta primeiro o endpoint local do Vite / Servidor
    let res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => null);

    if (!res || res.status === 404) {
      res = await fetch('/fitcoach/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => null);
    }

    if (!res) {
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor de e-mail.',
      };
    }

    const json = await res.json();

    if (res.ok && json.success) {
      recordAttempt('EMAIL_SEND', data.toEmail, true);
      return {
        success: true,
        messageId: json.messageId,
      };
    }

    recordAttempt('EMAIL_SEND', data.toEmail, false);

    const isDomainRestriction =
      json.statusCode === 403 ||
      (json.message && json.message.includes('testing emails to your own email address')) ||
      (json.error && json.error.includes('testing emails'));

    return {
      success: false,
      error: json.message || json.error || 'Falha ao enviar e-mail pelo Resend.',
      resendDomainRestriction: isDomainRestriction,
    };
  } catch (err: any) {
    recordAttempt('EMAIL_SEND', data.toEmail, false);
    console.warn('[EmailService] Erro:', err);
    return {
      success: false,
      error: err.message || 'Erro inesperado ao enviar o e-mail de convite.',
    };
  }
}

/**
 * Dispara o e-mail oficial de redefinição de senha
 */
export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<SendInviteResult> {
  const cleanEmail = (data.toEmail || '').trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return {
      success: false,
      error: 'Endereço de e-mail inválido ou malformado.',
    };
  }

  const rateCheck = checkRateLimit('EMAIL_SEND', cleanEmail);
  if (!rateCheck.allowed) {
    return {
      success: false,
      error: `Limite de envios atingido. Por segurança, aguarde ${formatSecondsToTime(rateCheck.lockoutSeconds)} antes de solicitar outro e-mail.`,
    };
  }

  const { subject, html } = generatePasswordResetEmailHtml(data);

  try {
    const payload = JSON.stringify({
      type: 'PASSWORD_RESET',
      to: data.toEmail,
      subject,
      html,
    });

    let res = await fetch('/api/send-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }).catch(() => null);

    if (!res || res.status === 404) {
      res = await fetch('/fitcoach/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      }).catch(() => null);
    }

    if (!res) {
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor de e-mail.',
      };
    }

    const json = await res.json();

    if (res.ok && json.success) {
      recordAttempt('EMAIL_SEND', data.toEmail, true);
      return {
        success: true,
        messageId: json.messageId,
      };
    }

    recordAttempt('EMAIL_SEND', data.toEmail, false);

    const isDomainRestriction =
      json.statusCode === 403 ||
      (json.message && json.message.includes('testing emails to your own email address')) ||
      (json.error && json.error.includes('testing emails'));

    return {
      success: false,
      error: json.message || json.error || 'Falha ao enviar e-mail pelo Resend.',
      resendDomainRestriction: isDomainRestriction,
    };
  } catch (err: any) {
    recordAttempt('EMAIL_SEND', data.toEmail, false);
    return {
      success: false,
      error: err.message || 'Erro inesperado ao enviar e-mail de recuperação.',
    };
  }
}

