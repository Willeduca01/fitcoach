import nodemailer from 'nodemailer';

// Cache em memória para rastreamento de requisições na borda/servidor
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    rateLimitMap.set(key, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);

  // Limpeza periódica leve
  if (rateLimitMap.size > 2000) {
    rateLimitMap.clear();
  }

  return false;
}

/**
 * Sanitiza o HTML para e-mails no servidor:
 * Remove elementos executáveis (<script>, <iframe>, <object>, <embed>, <applet>)
 * e atributos de manipuladores de eventos inline (onload, onerror, onclick, etc.).
 */
function sanitizeEmailHtml(rawHtml: string): string {
  if (!rawHtml || typeof rawHtml !== 'string') return '';

  return rawHtml
    // Remove tags de script e seus conteúdos
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove iframes e conteúdos
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove objects e embeds
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove formulários injetados
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    // Neutraliza atributos de manipuladores de eventos (onclick, onload, onerror, etc.)
    .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
    // Neutraliza esquemas javascript: ou data:text/html em links
    .replace(/href\s*=\s*["']?\s*(?:javascript|data:text\/html):[^"'>\s]*/gi, 'href="#"');
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default async function handler(req: any, res: any) {
  // Headers de Segurança Estritos (OWASP)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Obter o IP do cliente
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket?.remoteAddress || 'unknown-ip';

  // 2. Rate Limiting por IP: máx 5 requisições por minuto por IP
  if (isRateLimited(`ip_${clientIp}`, 5, 60 * 1000)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'Limite de requisições excedido. Por segurança, aguarde 1 minuto antes de enviar outro e-mail.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }

  const { to, subject, type } = req.body || {};
  let rawHtml = req.body?.html;

  if (!to || !rawHtml || typeof rawHtml !== 'string') {
    return res.status(400).json({ error: 'Campos to e html são obrigatórios e devem ser válidos.' });
  }

  // Limite razoável de tamanho do HTML para prevenir DoS (250 KB)
  if (rawHtml.length > 250 * 1024) {
    return res.status(400).json({ error: 'Corpo do e-mail excede o limite máximo permitido.' });
  }

  const cleanTo = String(to).toLowerCase().trim();

  // Prevenção de Email Header Injection (CRLF) e validação de formato
  if (/[\r\n]/.test(cleanTo) || !EMAIL_REGEX.test(cleanTo)) {
    return res.status(400).json({ error: 'Endereço de e-mail inválido ou malformado.' });
  }

  // Prevenção de Header Injection no assunto
  const cleanSubject = String(subject || 'FitCoach Pro • Notificação de Acesso')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 200);

  // 3. Rate Limiting por Destinatário: máx 3 e-mails para o mesmo destinatário a cada 5 minutos
  if (isRateLimited(`to_${cleanTo}`, 3, 5 * 60 * 1000)) {
    res.setHeader('Retry-After', '300');
    return res.status(429).json({
      error: 'Limite de envios para este endereço de e-mail atingido. Aguarde 5 minutos.',
      code: 'EMAIL_RATE_LIMIT_EXCEEDED'
    });
  }

  // Higienização de segurança do HTML antes de despachar
  let html = sanitizeEmailHtml(rawHtml);

  // Se for redefinição de senha, gera o link seguro com token criptográfico do Supabase
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xmpbzpdggsonzftueynw.supabase.co';

  if (type === 'PASSWORD_RESET' && serviceRoleKey) {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      const origin = req.headers.origin || 'https://fitcoach-willtec.vercel.app';
      const basePath = process.env.VERCEL ? '' : '/fitcoach';
      const redirectTo = `${origin}${basePath}/?type=recovery`;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: cleanTo,
        options: { redirectTo },
      });

      if (!linkError && linkData?.properties?.action_link) {
        const actionLink = linkData.properties.action_link;
        if (/^https?:\/\//i.test(actionLink)) {
          const safeActionLink = actionLink.replace(/"/g, '&quot;');
          html = html.replaceAll('__FITCOACH_RESET_URL__', safeActionLink);
          html = html.replace(/https?:\/\/[^"'\s]+#\/redefinir-senha[^"'\s]*/g, safeActionLink);
          html = html.replace(/href=""/g, `href="${safeActionLink}"`);
          html = html.replace(/href=''/g, `href='${safeActionLink}'`);
        }
      }
    } catch (adminErr) {
      console.warn('[API Send Invite] Erro Supabase Admin generateLink:', adminErr);
    }
  }

  // Prioridade 1: Gmail SMTP
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
      });

      const info = await transporter.sendMail({
        from: `"FitCoach Pro" <${gmailUser}>`,
        to: cleanTo,
        subject: cleanSubject,
        html,
      });

      return res.status(200).json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error('[API Send Invite] Erro Gmail SMTP:', err);
      return res.status(500).json({ error: 'Falha ao processar envio pelo serviço de e-mail.' });
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Nenhum provedor de e-mail configurado no servidor.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FitCoach Pro <onboarding@resend.dev>',
        to: [cleanTo],
        subject: cleanSubject,
        html,
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      return res.status(200).json({ success: true, messageId: data.id });
    }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro interno no servidor ao despachar e-mail.' });
  }
}
