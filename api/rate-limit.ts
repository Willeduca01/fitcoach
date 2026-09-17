// Serverless API Handler para Vercel: Rate Limiting Robusto Baseado em IP Real

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const ACTION_CONFIGS: Record<string, RateLimitConfig> = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
    lockoutMs: 5 * 60 * 1000,
  },
  INVITE_VALIDATION: {
    maxAttempts: 8,
    windowMs: 5 * 60 * 1000,
    lockoutMs: 10 * 60 * 1000,
  },
  SIGNUP: {
    maxAttempts: 4,
    windowMs: 10 * 60 * 1000,
    lockoutMs: 10 * 60 * 1000,
  },
  EMAIL_SEND: {
    maxAttempts: 5,
    windowMs: 5 * 60 * 1000,
    lockoutMs: 5 * 60 * 1000,
  },
};

interface IpRecord {
  attempts: number[];
  lockedUntil: number | null;
}

const serverIpStore = new Map<string, IpRecord>();

function getClientIp(req: any): string {
  const forwarded = req.headers['x-forwarded-for'];
  let raw = '';
  if (typeof forwarded === 'string') {
    raw = forwarded.split(',')[0].trim();
  } else if (Array.isArray(forwarded)) {
    raw = forwarded[0].trim();
  } else {
    raw = req.headers['x-real-ip'] || req.socket?.remoteAddress || '127.0.0.1';
  }
  return raw.replace(/^::ffff:/, '').trim() || '127.0.0.1';
}

export default async function handler(req: any, res: any) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const clientIp = getClientIp(req);

  if (req.method === 'GET') {
    return res.status(200).json({ ip: clientIp, timestamp: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action = 'LOGIN', op = 'check' } = req.body || {};
  const config = ACTION_CONFIGS[action] || ACTION_CONFIGS.LOGIN;
  const storeKey = ${action}_ip_;

  let record = serverIpStore.get(storeKey);
  if (!record) {
    record = { attempts: [], lockedUntil: null };
    serverIpStore.set(storeKey, record);
  }

  const now = Date.now();

  if (op === 'success') {
    record.attempts = [];
    record.lockedUntil = null;
    return res.status(200).json({
      ip: clientIp,
      allowed: true,
      remainingAttempts: config.maxAttempts,
      lockoutSeconds: 0,
    });
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    record.lockedUntil = null;
    record.attempts = [];
  }

  if (op === 'fail') {
    const valid = record.attempts.filter((t) => now - t < config.windowMs);
    valid.push(now);
    record.attempts = valid;
    if (valid.length >= config.maxAttempts) {
      record.lockedUntil = now + config.lockoutMs;
    }
  }

  const isLocked = Boolean(record.lockedUntil && record.lockedUntil > now);
  const lockoutSeconds = isLocked ? Math.ceil((record.lockedUntil - now) / 1000) : 0;
  const validAttempts = record.attempts.filter((t) => now - t < config.windowMs);
  const remaining = isLocked ? 0 : Math.max(0, config.maxAttempts - validAttempts.length);

  if (isLocked) {
    res.setHeader('Retry-After', String(lockoutSeconds));
    return res.status(429).json({
      ip: clientIp,
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds,
      error: Acesso bloqueado temporariamente por excesso de tentativas para o IP . Aguarde s.,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  return res.status(200).json({
    ip: clientIp,
    allowed: true,
    remainingAttempts: remaining,
    lockoutSeconds: 0,
  });
}