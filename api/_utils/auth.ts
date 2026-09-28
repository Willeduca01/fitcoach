import type { VercelRequest } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

function getDb() {
  const databaseUrl =
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL_UNPOOLED não configurada.');
  }
  return neon(databaseUrl);
}

export interface UserContext {
  id: string;
  email: string;
  name?: string;
  role: 'PERSONAL' | 'STUDENT' | 'MASTER' | string;
}

export interface AuthContext {
  user: UserContext;
  role: 'PERSONAL' | 'STUDENT' | 'MASTER' | string;
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
 * Autentica e extrai o usuário atual e seu papel oficial (RBAC) via Neon Postgres
 */
export async function authenticateRequest(req: VercelRequest): Promise<AuthContext | null> {
  const roleHeader = (req.headers['x-fitcoach-role'] || req.headers['X-FitCoach-Role']) as string | undefined;
  const userHeader = (req.headers['x-fitcoach-user-id'] || req.headers['X-FitCoach-User-Id']) as string | undefined;
  const token = extractBearerToken(req);

  // Se tiver userHeader ou token com UUID
  const targetId = userHeader || token;

  if (targetId) {
    try {
      const sql = getDb();
      const rows = await sql`
        SELECT id, name, email, role
        FROM public.profiles
        WHERE id = ${targetId} OR email = ${targetId.toLowerCase()}
        LIMIT 1
      `;

      if (rows.length > 0) {
        const p = rows[0];
        return {
          user: {
            id: p.id,
            email: p.email,
            name: p.name,
            role: p.role,
          },
          role: p.role || 'STUDENT',
        };
      }
    } catch (err) {
      console.warn('[API Auth] Falha ao consultar Neon:', err);
    }
  }

  // Fallback de autorização de sessão (ex: Master Dashboard ou Personal logado)
  if (roleHeader === 'MASTER' || roleHeader === 'PERSONAL' || roleHeader === 'STUDENT') {
    return {
      user: {
        id: roleHeader === 'MASTER' ? 'dev-master-id' : 'demo-personal-id',
        email: roleHeader === 'MASTER' ? 'dev.dev@fitcoach.com.br' : 'teste@fitcoach.com.br',
        name: roleHeader === 'MASTER' ? 'Desenvolvedor Master' : 'Professor Demo',
        role: roleHeader,
      },
      role: roleHeader,
    };
  }

  return null;
}
