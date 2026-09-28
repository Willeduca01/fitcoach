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
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const sql = getDb();

    // 1. Perfis de Personal Trainers
    const trainers = await sql`
      SELECT 
        p.id, 
        p.name, 
        p.email, 
        p.phone, 
        p.created_at, 
        p.updated_at,
        pp.title, 
        pp.cref
      FROM public.profiles p
      LEFT JOIN public.personal_profiles pp ON p.id = pp.id
      WHERE p.role = 'PERSONAL'
      ORDER BY p.created_at DESC;
    `;

    // 2. Todos os alunos
    const students = await sql`
      SELECT id, personal_id, name, email, phone, plan, status, start_date, created_at, updated_at
      FROM public.students
      ORDER BY created_at DESC;
    `;

    // 3. Convites
    const invites = await sql`
      SELECT id, code, type, status, created_at, expires_at
      FROM public.invites
      ORDER BY created_at DESC;
    `;

    return res.status(200).json({
      success: true,
      trainers,
      students,
      invites,
    });
  } catch (err: any) {
    console.error('[API master-data] Erro:', err);
    return res.status(500).json({ error: 'Erro ao buscar dados do master.' });
  }
}
