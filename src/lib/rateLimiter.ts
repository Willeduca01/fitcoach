/**
 * FITCOACH PRO — MÓDULO DE SEGURANÇA E RATE LIMITING POR IP & DISPOSITIVO
 * Proteção ultra-resiliente contra ataques de força bruta, recarga de página (F5),
 * troca de e-mail e spam em massa.
 */

export type RateLimitAction = 'LOGIN' | 'INVITE_VALIDATION' | 'SIGNUP' | 'EMAIL_SEND';

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

export const ACTION_CONFIGS: Record<RateLimitAction, RateLimitConfig> = {
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

export interface RateLimitRecord {
  attempts: number[];
  lockedUntil: number | null;
}

export interface RateLimitStatus {
  allowed: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
  ip?: string;
  reason?: string;
}

const STORAGE_PREFIX = 'fitcoach_rate_limit_';
const CLIENT_IP_KEY = 'fitcoach_client_ip';
const DEVICE_ID_KEY = 'fitcoach_device_id';

export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'default_device';
  }
}

let cachedClientIp: string = (() => {
  try {
    return localStorage.getItem(CLIENT_IP_KEY) || '';
  } catch {
    return '';
  }
})();

function notifyListeners(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('fitcoach_rate_limit_updated'));
  }
}

export async function resolveClientIp(): Promise<string> {
  if (cachedClientIp) {
    return cachedClientIp;
  }

  // 1. Tenta endpoint da aplicação (/api/rate-limit)
  try {
    const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
    const res = await fetch(`${basePath}/api/rate-limit`, { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip && data.ip !== 'unknown-ip') {
        cachedClientIp = data.ip;
        localStorage.setItem(CLIENT_IP_KEY, data.ip);
        notifyListeners();
        return data.ip;
      }
    }
  } catch {}

  // 2. Fallback público rápido (api64.ipify / api.ipify)
  try {
    const res = await fetch('https://api64.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ip) {
        cachedClientIp = data.ip;
        localStorage.setItem(CLIENT_IP_KEY, data.ip);
        notifyListeners();
        return data.ip;
      }
    }
  } catch {}

  return cachedClientIp || '127.0.0.1';
}

// Inicia resolução em background no navegador
if (typeof window !== 'undefined') {
  resolveClientIp();
}

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

function getKeysToCheck(action: RateLimitAction, specificKey?: string): string[] {
  const keys: string[] = [];
  if (cachedClientIp) {
    keys.push(`ip_${cachedClientIp}`);
  }
  keys.push(`device_${getDeviceId()}`);
  keys.push(`action_${action}`);
  if (specificKey && specificKey.trim() && specificKey.trim() !== 'global') {
    keys.push(`user_${specificKey.trim().toLowerCase()}`);
  }
  return keys;
}

export function checkRateLimit(action: RateLimitAction, specificKey?: string): RateLimitStatus {
  const config = ACTION_CONFIGS[action] || ACTION_CONFIGS.LOGIN;
  const keys = getKeysToCheck(action, specificKey);
  const now = Date.now();

  let maxLockoutSec = 0;
  let isAnyLocked = false;
  let minRemaining = config.maxAttempts;

  for (const k of keys) {
    const record = getRecord(action, k);

    // 1. Checa se o registro está ativamente bloqueado
    if (record.lockedUntil && record.lockedUntil > now) {
      isAnyLocked = true;
      const sec = Math.ceil((record.lockedUntil - now) / 1000);
      if (sec > maxLockoutSec) {
        maxLockoutSec = sec;
      }
    } else if (record.lockedUntil && record.lockedUntil <= now) {
      // Bloqueio expirou: limpa
      record.lockedUntil = null;
      record.attempts = [];
      saveRecord(action, k, record);
    }

    // 2. Calcula tentativas válidas na janela
    const validAttempts = record.attempts.filter((timestamp) => now - timestamp < config.windowMs);
    const remaining = Math.max(0, config.maxAttempts - validAttempts.length);
    if (remaining < minRemaining) {
      minRemaining = remaining;
    }
  }

  if (isAnyLocked) {
    return {
      allowed: false,
      remainingAttempts: 0,
      lockoutSeconds: maxLockoutSec,
      ip: cachedClientIp || undefined,
      reason: 'Acesso bloqueado temporariamente por excesso de tentativas neste IP/dispositivo.',
    };
  }

  return {
    allowed: minRemaining > 0,
    remainingAttempts: minRemaining,
    lockoutSeconds: 0,
    ip: cachedClientIp || undefined,
  };
}

export function recordAttempt(
  action: RateLimitAction,
  specificKey?: string,
  success: boolean = false
): RateLimitStatus {
  const config = ACTION_CONFIGS[action] || ACTION_CONFIGS.LOGIN;
  const keys = getKeysToCheck(action, specificKey);
  const now = Date.now();

  // 1. Em caso de sucesso, limpa os contadores em todas as chaves
  if (success) {
    for (const k of keys) {
      saveRecord(action, k, { attempts: [], lockedUntil: null });
    }
    notifyListeners();

    // Notifica backend serverless
    try {
      const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
      fetch(`${basePath}/api/rate-limit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, op: 'success' }),
      }).catch(() => null);
    } catch {}

    return {
      allowed: true,
      remainingAttempts: config.maxAttempts,
      lockoutSeconds: 0,
      ip: cachedClientIp || undefined,
    };
  }

  // 2. Em caso de falha: registra em todas as chaves (IP + Dispositivo + E-mail + Ação)
  let isLocked = false;
  let maxLockoutSec = 0;
  let minRemaining = config.maxAttempts;

  for (const k of keys) {
    const record = getRecord(action, k);
    const validAttempts = record.attempts.filter((timestamp) => now - timestamp < config.windowMs);
    validAttempts.push(now);

    if (validAttempts.length >= config.maxAttempts) {
      isLocked = true;
      record.lockedUntil = now + config.lockoutMs;
      const sec = Math.ceil(config.lockoutMs / 1000);
      if (sec > maxLockoutSec) {
        maxLockoutSec = sec;
      }
    }

    record.attempts = validAttempts;
    saveRecord(action, k, record);

    const remaining = Math.max(0, config.maxAttempts - validAttempts.length);
    if (remaining < minRemaining) {
      minRemaining = remaining;
    }
  }

  notifyListeners();

  // Notifica o backend serverless para travar por IP na infraestrutura
  try {
    const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
    fetch(`${basePath}/api/rate-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, op: 'fail', identifier: specificKey }),
    }).catch(() => null);
  } catch {}

  return {
    allowed: !isLocked,
    remainingAttempts: isLocked ? 0 : minRemaining,
    lockoutSeconds: maxLockoutSec,
    ip: cachedClientIp || undefined,
  };
}

export async function syncServerRateLimit(
  action: RateLimitAction,
  specificKey?: string
): Promise<RateLimitStatus> {
  try {
    const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
    const res = await fetch(`${basePath}/api/rate-limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, op: 'check', identifier: specificKey }),
    });

    if (res.status === 429) {
      const data = await res.json();
      const sec = data.lockoutSeconds || 300;
      if (data.ip) {
        cachedClientIp = data.ip;
        localStorage.setItem(CLIENT_IP_KEY, data.ip);
      }

      // Aplica o bloqueio localmente para manter coerência com o servidor
      const now = Date.now();
      const lockRecord: RateLimitRecord = {
        attempts: Array(ACTION_CONFIGS[action].maxAttempts).fill(now),
        lockedUntil: now + sec * 1000,
      };

      const keys = getKeysToCheck(action, specificKey);
      for (const k of keys) {
        saveRecord(action, k, lockRecord);
      }

      notifyListeners();

      return {
        allowed: false,
        remainingAttempts: 0,
        lockoutSeconds: sec,
        ip: data.ip || cachedClientIp,
        reason: data.error || 'Acesso bloqueado por excesso de tentativas no IP.',
      };
    }
  } catch {}

  return checkRateLimit(action, specificKey);
}

export function subscribeToRateLimit(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('fitcoach_rate_limit_updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('fitcoach_rate_limit_updated', callback);
    window.removeEventListener('storage', callback);
  };
}

export function resetRateLimit(action: RateLimitAction, specificKey?: string): void {
  const keys = getKeysToCheck(action, specificKey);
  for (const k of keys) {
    const storageKey = `${STORAGE_PREFIX}${action}_${k.trim().toLowerCase()}`;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  }
  notifyListeners();
}

export function formatSecondsToTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
