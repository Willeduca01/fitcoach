import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

function getDb() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada.');
  }
  return neon(databaseUrl);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers de Segurança
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const rawPassword = String(password);

  try {
    const sql = getDb();

    // 1. Busca perfil no Neon Postgres
    const rows = await sql`
      SELECT 
        id, 
        role, 
        name, 
        email, 
        phone, 
        avatar_url,
        password_hash,
        (password_hash IS NOT NULL AND password_hash = crypt(${rawPassword}, password_hash)) as is_valid
      FROM public.profiles
      WHERE LOWER(email) = ${cleanEmail}
      LIMIT 1;
    `;

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Nenhuma conta encontrada com este e-mail. Solicite um convite de acesso.',
      });
    }

    const user = rows[0];

    // Se ainda não tinha password_hash gravado (ex: conta importada), grava na primeira autenticação válida
    if (!user.password_hash) {
      await sql`
        UPDATE public.profiles
        SET password_hash = crypt(${rawPassword}, gen_salt('bf')),
            updated_at = NOW()
        WHERE id = ${user.id}::uuid;
      `;
    } else if (!user.is_valid) {
      return res.status(401).json({
        success: false,
        error: 'Senha incorreta. Verifique os dados digitados ou redefina sua senha.',
      });
    }

    // Se for aluno, busca o studentId correspondente
    let studentId: string | null = null;
    if (user.role === 'STUDENT') {
      const studentRows = await sql`
        SELECT id FROM public.students
        WHERE user_id = ${user.id}::uuid OR LOWER(email) = ${cleanEmail}
        LIMIT 1;
      `;
      if (studentRows.length > 0) {
        studentId = studentRows[0].id;
      }
    }

    return res.status(200).json({
      success: true,
      role: user.role,
      studentId,
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatarUrl: user.avatar_url,
      },
    });
  } catch (err: any) {
    console.error('[API Login] Erro na autenticação com Neon:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro interno no servidor ao processar autenticação.',
    });
  }
}
