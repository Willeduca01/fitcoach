import type { VercelRequest } from '@vercel/node';
import { createClient, User } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xmpbzpdggsonzftueynw.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export interface AuthContext {
  user: User;
  role: 'PERSONAL' | 'STUDENT' | 'MASTER' | string;
}

/**
 * Cria cliente administrativo do Supabase com service_role_key
 */
export function getSupabaseAdmin() {
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY não está configurada.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Extrai o token Bearer do cabeçalho Authorization
 */
export function extractBearerToken(req: VercelRequest): string | null {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader || typeof authHeader !== 'string') return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/**
 * Autentica e extrai o usuário atual e seu papel oficial (RBAC)
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthContext | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    // Busca o papel oficial na tabela profiles
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return {
      user,
      role: profile?.role || 'STUDENT',
    };
  } catch (err) {
    console.error('[API Auth] Erro ao autenticar requisição:', err);
    return null;
  }
}
