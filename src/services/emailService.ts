import {
  InviteEmailData,
  generateInviteEmailHtml,
  generatePasswordResetEmailHtml,
  PasswordResetEmailData,
} from '../lib/emailTemplates';
import { checkRateLimit, recordAttempt, formatSecondsToTime } from '../lib/rateLimiter';
import { isValidEmail, sanitizeHeader } from '../lib/security';
import { supabase } from '../lib/supabase';

import { systemLogger } from '../lib/systemLogger';

export interface SendInviteResult {
  success: boolean;
  messageId?: string;
  error?: string;
  resendDomainRestriction?: boolean;
  technicalDetails?: {
    status?: number;
    statusText?: string;
    endpoint?: string;
    code?: string;
    responseBody?: string;
    location?: string;
    timestamp?: string;
  };
}

/**
 * Dispara o e-mail de convite para a API segura (Gmail SMTP / Resend) com proteção de Rate Limit
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
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const authHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }

    const payload = JSON.stringify({
      to: data.toEmail,
      subject,
      html,
      inviteCode: data.inviteCode,
      role: data.role,
    });

    let calledEndpoint = '/api/send-invite';
    let res = await fetch(calledEndpoint, {
      method: 'POST',
      headers: authHeaders,
      body: payload,
    }).catch(() => null);

    if (!res || res.status === 404) {
      calledEndpoint = '/fitcoach/api/send-invite';
      res = await fetch(calledEndpoint, {
        method: 'POST',
        headers: authHeaders,
        body: payload,
      }).catch(() => null);
    }

    if (!res) {
      const err = 'Não foi possível conectar ao servidor de e-mail (Offline ou DNS).';
      systemLogger.error('NETWORK', 'NETWORK_OFFLINE', err, { endpoint: calledEndpoint, recipient: data.toEmail });
      return {
        success: false,
        error: err,
        technicalDetails: { endpoint: calledEndpoint, location: 'src/services/emailService.ts:fetch' },
      };
    }

    // Leitura segura do corpo da resposta para prevenir SyntaxError: Unexpected token
    const rawText = await res.text().catch(() => '');
    let json: any = null;
    try {
      json = JSON.parse(rawText);
    } catch {
      // Resposta não-JSON (por exemplo, página de erro 500 em texto ou HTML da Vercel)
    }

    const timestamp = new Date().toLocaleTimeString('pt-BR');

    if (res.ok && json?.success) {
      recordAttempt('EMAIL_SEND', data.toEmail, true);
      systemLogger.info(
        'EMAIL',
        'EMAIL_SEND_SUCCESS',
        `Convite enviado com sucesso para ${data.toEmail} (${json.provider || 'Provedor Ativo'})`,
        { messageId: json.messageId, provider: json.provider, recipient: data.toEmail }
      );
      return {
        success: true,
        messageId: json.messageId,
      };
    }

    recordAttempt('EMAIL_SEND', data.toEmail, false);

    // Se o servidor retornou HTML/texto não formatado como JSON
    if (!json) {
      const isVercelServerCrash = rawText.includes('A server error') || res.status === 500;
      const errorMsg = isVercelServerCrash
        ? `Falha no servidor da Vercel (HTTP ${res.status}): A função serverless /api/send-invite crashou ou variáveis de ambiente foram recém-alteradas.`
        : `Erro HTTP ${res.status} retornado pelo servidor: ${rawText.slice(0, 150) || 'Resposta vazia'}`;

      systemLogger.error(
        'EMAIL',
        'EMAIL_SERVER_ERROR',
        errorMsg,
        {
          endpoint: calledEndpoint,
          status: res.status,
          statusText: res.statusText,
          rawResponse: rawText.slice(0, 500),
          recipient: data.toEmail,
          location: 'api/send-invite.ts -> src/services/emailService.ts',
        }
      );

      return {
        success: false,
        error: errorMsg,
        technicalDetails: {
          status: res.status,
          statusText: res.statusText,
          endpoint: calledEndpoint,
          responseBody: rawText.slice(0, 300),
          location: 'api/send-invite.ts -> src/services/emailService.ts',
          timestamp,
        },
      };
    }

    // Se retornou JSON com erro estruturado
    const isDomainRestriction =
      json.statusCode === 403 ||
      (json.message && json.message.includes('testing emails to your own email address')) ||
      (json.error && json.error.includes('testing emails'));

    const isGmailAuthError = json.code === 'GMAIL_SMTP_ERROR' || (json.details && String(json.details).includes('535'));

    systemLogger.error(
      'EMAIL',
      isDomainRestriction ? 'RESEND_DOMAIN_RESTRICTION' : isGmailAuthError ? 'GMAIL_SMTP_AUTH_ERROR' : 'EMAIL_SEND_FAILED',
      json.error || json.message || 'Falha ao processar envio de e-mail.',
      {
        endpoint: calledEndpoint,
        status: res.status,
        code: json.code,
        details: json.details,
        location: json.location || 'api/send-invite.ts',
        recipient: data.toEmail,
      }
    );

    return {
      success: false,
      error: json.error || json.message || 'Falha ao despachar e-mail.',
      resendDomainRestriction: isDomainRestriction,
      technicalDetails: {
        status: res.status,
        statusText: res.statusText,
        endpoint: calledEndpoint,
        code: json.code,
        responseBody: JSON.stringify(json, null, 2),
        location: json.location || 'api/send-invite.ts',
        timestamp,
      },
    };
  } catch (err: any) {
    recordAttempt('EMAIL_SEND', data.toEmail, false);
    console.warn('[EmailService] Exceção capturada:', err);

    systemLogger.error(
      'EMAIL',
      'EMAIL_SEND_FAILED',
      `Exceção no frontend ao processar envio: ${err.message || 'Erro inesperado'}`,
      { recipient: data.toEmail, stack: err.stack, location: 'src/services/emailService.ts' }
    );

    return {
      success: false,
      error: err.message || 'Erro inesperado ao enviar o e-mail de convite.',
      technicalDetails: {
        location: 'src/services/emailService.ts:catch',
        responseBody: err.stack || err.message,
        timestamp: new Date().toLocaleTimeString('pt-BR'),
      },
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

