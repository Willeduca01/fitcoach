import { InviteEmailData, generateInviteEmailHtml } from '../lib/emailTemplates';

export interface SendInviteResult {
  success: boolean;
  messageId?: string;
  error?: string;
  resendDomainRestriction?: boolean;
}

/**
 * Dispara o e-mail de convite para a API segura (Resend)
 */
export async function sendInviteEmail(data: InviteEmailData): Promise<SendInviteResult> {
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
      return {
        success: true,
        messageId: json.messageId,
      };
    }

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
    console.warn('[EmailService] Erro:', err);
    return {
      success: false,
      error: err.message || 'Erro inesperado ao enviar o e-mail de convite.',
    };
  }
}
