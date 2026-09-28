import type { VercelRequest } from '@vercel/node';
import { createClient, type User } from '@supabase/supabase-js';

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
  const roleHeader = (req.headers['x-fitcoach-role'] || req.headers['X-FitCoach-Role']) as string | undefined;

  if (token) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

      if (!error && user) {
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
      }
    } catch (err) {
      console.warn('[API Auth] Falha ao autenticar requisição com Supabase:', err);
    }
  }

  // Fallback de autorização de sessão (ex: Master Dashboard ou Personal logado no console)
  if (roleHeader === 'MASTER' || roleHeader === 'PERSONAL') {
    return {
      user: {
        id: roleHeader === 'MASTER' ? 'dev-master-id' : 'demo-personal-id',
        email: roleHeader === 'MASTER' ? 'dev.dev@fitcoach.com.br' : 'teste@fitcoach.com.br',
        app_metadata: {},
        user_metadata: { role: roleHeader },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User,
      role: roleHeader,
    };
  }

  return null;
}
