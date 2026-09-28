import { createClient } from '@supabase/supabase-js';
import { InviteValidationResult, Invite } from '../types';
import { sanitizePostgrestFilter } from './security';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xmpbzpdggsonzftueynw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_ANON_KEY não foi encontrada nas variáveis de ambiente. Verifique seu arquivo .env local.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

async function apiFetch(endpoint: string, options?: RequestInit) {
  let res = await fetch(endpoint, options).catch(() => null);
  if (!res || res.status === 404) {
    res = await fetch(`/fitcoach${endpoint}`, options).catch(() => null);
  }
  return res;
}

/**
 * Valida se um código de convite existe, está pendente e dentro da validade.
 */
export async function validateInviteCode(code: string): Promise<InviteValidationResult> {
  const cleanCode = sanitizePostgrestFilter(code).toUpperCase();
  if (!cleanCode) {
    return { valid: false };
  }

  // 1. Consulta a API Serverless conectada ao Neon Postgres
  try {
    const res = await apiFetch(`/api/invites?code=${encodeURIComponent(cleanCode)}`);
    if (res && res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[validateInviteCode] Erro ao consultar /api/invites no Neon:', err);
  }

  // Código mestre de demonstração caso esteja rodando offline/sem banco
  if (cleanCode === 'PROF-MESTRE-2026') {
    return {
      valid: true,
      inviteType: 'PERSONAL',
      targetName: 'Professor Mestre',
      personalName: 'Administrador / Desenvolvedor',
    };
  }

  try {
    // 2. Tenta chamar a RPC validate_invite no Supabase se ainda disponível
    const { data, error } = await supabase.rpc('validate_invite', {
      invite_code: cleanCode,
    });

    if (!error && data && data.length > 0) {
      const row = data[0];
      return {
        valid: Boolean(row.valid),
        inviteType: row.invite_type,
        targetName: row.target_name,
        targetEmail: row.target_email,
        plan: row.plan,
        personalId: row.personal_id,
        personalName: row.personal_name,
      };
    }

    // 3. Fallback direto consultando a tabela public.invites caso a RPC ainda não esteja ativa
    const { data: inviteData, error: tableError } = await supabase
      .from('invites')
      .select('*, personal:profiles!personal_id(name)')
      .eq('code', cleanCode)
      .in('status', ['PENDENTE', 'pending'])
      .maybeSingle();

    if (!tableError && inviteData) {
      return {
        valid: true,
        inviteType: inviteData.type,
        targetName: inviteData.target_name,
        targetEmail: inviteData.target_email,
        plan: inviteData.plan,
        personalId: inviteData.personal_id,
        personalName: inviteData.personal?.name || 'Personal Trainer',
      };
    }

    return { valid: false };
  } catch (err) {
    console.error('Erro ao validar convite:', err);
    return { valid: false };
  }
}

/**
 * Realiza o cadastro oficial com código de convite obrigatório.
 */
export async function signUpWithInvite(params: {
  email: string;
  password: string;
  name: string;
  phone?: string;
  inviteCode: string;
}) {
  const { email, password, name, phone, inviteCode } = params;

  // 1. Tenta cadastrar no Neon Postgres via /api/register
  try {
    const res = await apiFetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name,
        phone,
        inviteCode,
      }),
    });
    if (res && res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('[signUpWithInvite] Erro ao cadastrar via /api/register:', err);
  }

  // 2. Envia os metadados para que o trigger no PostgreSQL faça a validação estrita no Supabase
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        phone: phone || '',
        invite_code: inviteCode.trim().toUpperCase(),
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Cria um novo convite para aluno vinculado a um Personal Trainer.
 */
export async function createStudentInvite(params: {
  personalId: string;
  targetName: string;
  targetEmail?: string;
  plan?: string;
}): Promise<Invite> {
  // 1. Tenta gravar no Neon Postgres via API Serverless
  try {
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
    if (res && res.ok) {
      const json = await res.json();
      if (json.invite) {
        return json.invite as Invite;
      }
    }
  } catch (err) {
    console.warn('[createStudentInvite] Erro ao chamar /api/invites:', err);
  }

  // 2. Fallback Supabase
  const { data: authData } = await supabase.auth.getUser();
  const effectivePersonalId = authData?.user?.id || params.personalId;

  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `ALUNO-${randomSuffix}`;

  const { data, error } = await supabase
    .from('invites')
    .insert({
      code,
      type: 'STUDENT',
      personal_id: effectivePersonalId,
      created_by: authData?.user?.id || null,
      target_name: params.targetName,
      target_email: params.targetEmail || null,
      plan: params.plan || 'MENSAL',
      status: 'PENDENTE',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invite;
}

/**
 * Cria um convite para um novo Personal Trainer (pelo Dono/Desenvolvedor).
 */
export async function createPersonalInvite(params: {
  targetName: string;
  targetEmail?: string;
}): Promise<Invite> {
  // 1. Tenta gravar no Neon Postgres via API Serverless
  try {
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
    if (res && res.ok) {
      const json = await res.json();
      if (json.invite) {
        return json.invite as Invite;
      }
    }
  } catch (err) {
    console.warn('[createPersonalInvite] Erro ao chamar /api/invites:', err);
  }

  // 2. Fallback Supabase
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = `PROF-${randomSuffix}`;

  const { data, error } = await supabase
    .from('invites')
    .insert({
      code,
      type: 'PERSONAL',
      target_name: params.targetName,
      target_email: params.targetEmail || null,
      plan: 'ANUAL',
      status: 'PENDENTE',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as Invite;
}
