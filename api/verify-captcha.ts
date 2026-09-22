import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serverless API Handler para Vercel: Validação Criptográfica do Cloudflare Turnstile CAPTCHA

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  let raw = '';
  if (typeof forwarded === 'string') {
    raw = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded)) {
    raw = forwarded[0].trim();
  } else {
    raw = (req.headers['x-real-ip'] as string) || req.socket?.remoteAddress || '127.0.0.1';
  }
  return raw.replace(/^::ffff:/, '').trim() || '127.0.0.1';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers estritos de segurança AppSec (OWASP)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const clientIp = getClientIp(req);
  const { token, action } = req.body || {};

  // Validação preliminar do token Turnstile
  if (!token || typeof token !== 'string' || token.trim().length < 5) {
    return res.status(400).json({
      success: false,
      error: 'Token do desafio anti-bot ausente ou malformado.',
    });
  }

  // Chave secreta de produção ou chave oficial de teste da Cloudflare (1x0000000000000000000000000000000AA)
  const secretKey =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    '1x0000000000000000000000000000000AA';

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secretKey);
    formData.append('response', token.trim());
    formData.append('remoteip', clientIp);

    const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!cfResponse.ok) {
      console.warn('[Turnstile API] Erro HTTP da Cloudflare:', cfResponse.status);
      return res.status(502).json({
        success: false,
        error: 'Falha na comunicação com o serviço de verificação do CAPTCHA.',
      });
    }

    const data = (await cfResponse.json()) as TurnstileVerifyResponse;

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.warn('[Turnstile API] Validação de bot falhou para IP:', clientIp, errorCodes);
      return res.status(403).json({
        success: false,
        error: 'Validação de segurança anti-bot falhou. Por favor, tente novamente.',
        errorCodes,
      });
    }

    return res.status(200).json({
      success: true,
      hostname: data.hostname,
      challengeTimestamp: data.challenge_ts,
    });
  } catch (err: any) {
    console.error('[Turnstile API] Exceção inesperada na verificação:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao validar desafio de segurança.',
    });
  }
}
