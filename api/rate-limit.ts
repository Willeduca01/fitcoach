import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getRateLimitKeys } from '../src/lib/security';

// Serverless API Handler para Vercel: Rate Limiting Multicamadas Robusto (IP + Conta/E-mail)

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

const serverStore = new Map<string, IpRecord>();

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

function getOrCreateRecord(key: string): IpRecord {
  let record = serverStore.get(key);
  if (!record) {
    record = { attempts: [], lockedUntil: null };
    serverStore.set(key, record);
  }
  return record;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers de Segurança Estritos (OWASP)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const clientIp = getClientIp(req);

  if (req.method === 'GET') {
    return res.status(200).json({ ip: clientIp, timestamp: Date.now() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Prevenção de memory leak
  if (serverStore.size > 5000) {
    const now = Date.now();
    for (const [k, v] of serverStore.entries()) {
      if ((!v.lockedUntil || v.lockedUntil <= now) && v.attempts.length === 0) {
        serverStore.delete(k);
      }
    }
    if (serverStore.size > 4000) serverStore.clear();
  }

  const { action = 'LOGIN', op = 'check', identifier } = req.body || {};
  const safeAction = ACTION_CONFIGS[action] ? action : 'LOGIN';
  const safeOp = ['check', 'success', 'fail'].includes(op) ? op : 'check';
  const config = ACTION_CONFIGS[safeAction];

  // Higieniza identificador de conta (e-mail, usuário)
  const cleanId = typeof identifier === 'string'
    ? identifier.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().toLowerCase()
    : '';

  // Chaves compostas para defesa em profundidade (OWASP):
  // 1. Chave por IP: Defesa contra DoS / flood massivo de uma mesma máquina/rede
  // 2. Chave por Conta: Defesa contra botnets e proxies rotativos que atacam um mesmo e-mail
  const keys: string[] = getRateLimitKeys(safeAction, clientIp, cleanId);

  const now = Date.now();

  // Em caso de sucesso, zera tentativas em todas as chaves associadas
  if (safeOp === 'success') {
    for (const k of keys) {
      const record = getOrCreateRecord(k);
      record.attempts = [];
      record.lockedUntil = null;
    }
    return res.status(200).json({
      ip: clientIp,
      allowed: true,
      remainingAttempts: config.maxAttempts,
      lockoutSeconds: 0,
    });
  }

  let isAnyLocked = false;
  let maxLockoutSec = 0;
  let minRemaining = config.maxAttempts;
  let lockReason = '';

  for (const k of keys) {
    const record = getOrCreateRecord(k);

    // Se o bloqueio já expirou, limpa
    if (record.lockedUntil && record.lockedUntil <= now) {
      record.lockedUntil = null;
      record.attempts = [];
    }

    // Se a requisição reporta falha de credencial
    if (safeOp === 'fail') {
      const valid = record.attempts.filter((t) => now - t < config.windowMs);
      valid.push(now);
      record.attempts = valid;
      if (valid.length >= config.maxAttempts) {
        record.lockedUntil = now + config.lockoutMs;
      }
    }

    const isLocked = Boolean(record.lockedUntil && record.lockedUntil > now);
    const validAttempts = record.attempts.filter((t) => now - t < config.windowMs);
    const remaining = isLocked ? 0 : Math.max(0, config.maxAttempts - validAttempts.length);

    if (remaining < minRemaining) {
      minRemaining = remaining;
    }

    if (isLocked) {
      isAnyLocked = true;
      const sec = Math.ceil((record.lockedUntil - now) / 1000);
      if (sec > maxLockoutSec) {
        maxLockoutSec = sec;
        lockReason = k.includes('_account_')
          ? `Conta bloqueada temporariamente por excesso de tentativas incorretas. Aguarde ${sec}s.`
          : `Acesso bloqueado temporariamente por excesso de tentativas para o IP ${clientIp}. Aguarde ${sec}s.`;
      }
    }
  }

  if (isAnyLocked) {
    res.setHeader('Retry-After', String(maxLockoutSec));
    return res.status(429).json({
      ip: clientIp,
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds: maxLockoutSec,
      error: lockReason || `Acesso bloqueado temporariamente. Aguarde ${maxLockoutSec}s.`,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  return res.status(200).json({
    ip: clientIp,
    allowed: true,
    remainingAttempts: minRemaining,
    lockoutSeconds: 0,
  });
}