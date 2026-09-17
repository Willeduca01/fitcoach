/**
 * FITCOACH PRO — MÓDULO DE SEGURANÇA E RATE LIMITING
 * Proteção robusta contra ataques de força bruta, spam de requisições e adivinhação de convites.
 */

export type RateLimitAction = 'LOGIN' | 'INVITE_VALIDATION' | 'SIGNUP' | 'EMAIL_SEND';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const ACTION_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
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

interface RateLimitRecord {
  attempts: number[];
  lockedUntil: number | null;
}

const STORAGE_PREFIX = 'fitcoach_rate_limit_';

function getRecord(action: RateLimitAction, key: string): RateLimitRecord {
  const storageKey = `${STORAGE_PREFIX}${action}_${key.trim().toLowerCase()}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return { attempts: [], lockedUntil: null };
    return JSON.parse(raw);
  } catch {
    return { attempts: [], lockedUntil: null };
  }
}

function saveRecord(action: RateLimitAction, key: string, record: RateLimitRecord): void {
  const storageKey = `${STORAGE_PREFIX}${action}_${key.trim().toLowerCase()}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(record));
  } catch (err) {
    console.warn('[RateLimiter] Erro ao salvar registro no storage:', err);
  }
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
}

export function checkRateLimit(action: RateLimitAction, key: string = 'global'): RateLimitStatus {
  const config = ACTION_CONFIGS[action];
  const record = getRecord(action, key);
  const now = Date.now();

  if (record.lockedUntil && record.lockedUntil > now) {
    const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds: remainingSeconds,
    };
  }

  if (record.lockedUntil && record.lockedUntil <= now) {
    record.lockedUntil = null;
    record.attempts = [];
    saveRecord(action, key, record);
  }

  const validAttempts = record.attempts.filter((timestamp) => now - timestamp < config.windowMs);
  const remaining = Math.max(0, config.maxAttempts - validAttempts.length);

  return {
    allowed: validAttempts.length < config.maxAttempts,
    remainingAttempts: remaining,
    lockoutSeconds: 0,
  };
}

export function recordAttempt(
  action: RateLimitAction,
  key: string = 'global',
  success: boolean = false
): RateLimitStatus {
  const config = ACTION_CONFIGS[action];
  const record = getRecord(action, key);
  const now = Date.now();

  if (success) {
    record.attempts = [];
    record.lockedUntil = null;
    saveRecord(action, key, record);
    return {
      allowed: true,
      remainingAttempts: config.maxAttempts,
      lockoutSeconds: 0,
    };
  }

  const validAttempts = record.attempts.filter((timestamp) => now - timestamp < config.windowMs);
  validAttempts.push(now);

  let isLocked = false;
  let lockoutSec = 0;

  if (validAttempts.length >= config.maxAttempts) {
    isLocked = true;
    record.lockedUntil = now + config.lockoutMs;
    lockoutSec = Math.ceil(config.lockoutMs / 1000);
  }

  record.attempts = validAttempts;
  saveRecord(action, key, record);

  return {
    allowed: !isLocked,
    remainingAttempts: Math.max(0, config.maxAttempts - validAttempts.length),
    lockoutSeconds: lockoutSec,
  };
}

export function resetRateLimit(action: RateLimitAction, key: string = 'global'): void {
  const storageKey = `${STORAGE_PREFIX}${action}_${key.trim().toLowerCase()}`;
  try {
    localStorage.removeItem(storageKey);
  } catch (err) {
    console.warn('[RateLimiter] Erro ao limpar:', err);
  }
}

export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
