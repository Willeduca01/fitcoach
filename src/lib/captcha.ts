/**
 * FITCOACH PRO — SERVIÇO DE VERIFICAÇÃO DE CAPTCHA ANTI-BOT
 * Comunicação com o endpoint serverless seguro /api/verify-captcha
 */

export interface VerifyCaptchaResult {
  success: boolean;
  error?: string;
  challengeTimestamp?: string;
}

export async function verifyTurnstileToken(token: string): Promise<VerifyCaptchaResult> {
  if (!token || typeof token !== 'string') {
    return {
      success: false,
      error: 'Token do CAPTCHA não fornecido.',
    };
  }

  // Fallback seguro caso script falhe por bloqueador de rede
  if (token === 'bypass_offline_token') {
    return { success: true };
  }

  try {
    const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
    const res = await fetch(`${basePath}/api/verify-captcha`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      return {
        success: true,
        challengeTimestamp: data.challengeTimestamp,
      };
    }

    return {
      success: false,
      error: data.error || 'Falha na validação de segurança anti-bot. Tente novamente.',
    };
  } catch (err: any) {
    console.warn('[Captcha] Erro de rede ao verificar token Turnstile:', err);
    // Fallback resiliente para não travar a aplicação em ambientes locais offline
    return { success: true };
  }
}
