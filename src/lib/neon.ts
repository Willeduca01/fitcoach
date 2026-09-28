import { InviteValidationResult, Invite } from '../types';
import { sanitizePostgrestFilter } from './security';

async function apiFetch(endpoint: string, options?: RequestInit) {
  let res = await fetch(endpoint, options).catch(() => null);
  if (!res || res.status === 404) {
    res = await fetch(`/fitcoach${endpoint}`, options).catch(() => null);
  }
  return res;
}

/**
 * Valida se um código de convite existe, está pendente e dentro da validade (Neon Postgres).
 */
export async function validateInviteCode(code: string): Promise<InviteValidationResult> {
  const cleanCode = sanitizePostgrestFilter(code).toUpperCase();
  if (!cleanCode) {
    return { valid: false };
  }

  // Código mestre de contingência
  if (cleanCode === 'PROF-MESTRE-2026') {
    return {
      valid: true,
      inviteType: 'PERSONAL',
      targetName: 'Professor Mestre',
      personalName: 'Administrador / Desenvolvedor',
    };
  }

  // Consulta API Serverless conectada ao Neon Postgres
  try {
    const res = await apiFetch(`/api/invites?code=${encodeURIComponent(cleanCode)}`);
    if (res && res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[validateInviteCode] Erro ao consultar Neon:', err);
  }

  return { valid: false, error: 'Convite não encontrado ou inválido.' };
}

/**
 * Realiza o cadastro oficial com código de convite obrigatório (Neon Postgres).
 */
export async function signUpWithInvite(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  inviteCode: string;
}) {
  const { email, password, name, phone, inviteCode } = params;

  const res = await apiFetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
      name: name.trim(),
      phone: phone?.trim() || '',
      inviteCode: inviteCode.trim().toUpperCase(),
    }),
  });

  if (!res) {
    throw new Error('Falha de conexão com o servidor.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Erro no processo de cadastro.');
  }

  return data;
}

/**
 * Cria um novo convite para aluno vinculado a um Personal Trainer (Neon Postgres).
 */
export async function createStudentInvite(params: {
  personalId: string;
  targetName: string;
  targetEmail?: string;
  plan?: string;
}): Promise<Invite> {
  const res = await apiFetch('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'STUDENT',
      targetName: params.targetName,
      targetEmail: params.targetEmail,
      plan: params.plan || 'MENSAL',
      personalId: params.personalId,
    }),
  });

  if (!res) {
    throw new Error('Falha de comunicação com o servidor Neon.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao gerar convite de aluno.');
  }

  return json.invite as Invite;
}

/**
 * Cria um convite para um novo Personal Trainer (pelo Dono/Desenvolvedor) (Neon Postgres).
 */
export async function createPersonalInvite(params: {
  targetName: string;
  targetEmail?: string;
}): Promise<Invite> {
  const res = await apiFetch('/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'PERSONAL',
      targetName: params.targetName,
      targetEmail: params.targetEmail,
      plan: 'ANUAL',
    }),
  });

  if (!res) {
    throw new Error('Falha de comunicação com o servidor Neon.');
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error || 'Erro ao gerar convite de professor.');
  }

  return json.invite as Invite;
}

/**
 * Solicita redefinição de senha via Neon Postgres
 */
export async function sendPasswordResetEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'REQUEST',
        email: email.trim().toLowerCase(),
      }),
    });

    if (!res) return { success: false, error: 'Falha ao conectar ao servidor.' };
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || 'Erro ao solicitar recuperação.' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado.' };
  }
}

/**
 * Redefine a senha via Neon Postgres
 */
export async function updatePassword(newPassword: string, token?: string, email?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await apiFetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'RESET',
        newPassword,
        token,
        email,
      }),
    });

    if (!res) return { success: false, error: 'Falha ao conectar ao servidor.' };
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: json.error || 'Erro ao redefinir senha.' };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro inesperado.' };
  }
}
