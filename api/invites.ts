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
  // Headers de Segurança Estritos (OWASP)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const sql = getDb();

  // 1. GET: Validação de Convite por Código
  if (req.method === 'GET') {
    const rawCode = req.query.code;
    if (!rawCode || typeof rawCode !== 'string') {
      return res.status(400).json({ valid: false, error: 'Código de convite ausente.' });
    }

    const cleanCode = rawCode.trim().toUpperCase();

    // Código mestre de fallback
    if (cleanCode === 'PROF-MESTRE-2026') {
      return res.status(200).json({
        valid: true,
        inviteType: 'PERSONAL',
        targetName: 'Professor Mestre',
        personalName: 'Administrador / Desenvolvedor',
      });
    }

    try {
      const rows = await sql`
        SELECT 
          i.id,
          i.code,
          i.type,
          i.target_name,
          i.target_email,
          i.plan,
          i.status,
          i.personal_id,
          i.expires_at,
          p.name as personal_name
        FROM public.invites i
        LEFT JOIN public.profiles p ON i.personal_id = p.id
        WHERE UPPER(i.code) = ${cleanCode}
        LIMIT 1;
      `;

      if (rows.length === 0) {
        return res.status(200).json({ valid: false, error: 'Código de convite não encontrado.' });
      }

      const inv = rows[0];

      if (inv.status !== 'PENDENTE') {
        return res.status(200).json({
          valid: false,
          error: `Este convite já foi utilizado ou está ${inv.status.toLowerCase()}.`,
        });
      }

      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return res.status(200).json({ valid: false, error: 'Este código de convite expirou.' });
      }

      return res.status(200).json({
        valid: true,
        inviteType: inv.type,
        targetName: inv.target_name,
        targetEmail: inv.target_email,
        plan: inv.plan,
        personalId: inv.personal_id,
        personalName: inv.personal_name || 'Administrador / Desenvolvedor',
      });
    } catch (err: any) {
      console.error('[API Invites GET] Erro ao validar convite no Neon:', err);
      return res.status(500).json({ valid: false, error: 'Erro interno ao validar convite no banco de dados.' });
    }
  }

  // 2. POST: Criação de Novo Convite no Neon Postgres
  if (req.method === 'POST') {
    const { type = 'PERSONAL', targetName, targetEmail, plan = 'ANUAL', personalId } = req.body || {};

    if (!targetName || typeof targetName !== 'string') {
      return res.status(400).json({ error: 'targetName é obrigatório.' });
    }

    const prefix = type === 'STUDENT' ? 'ALUNO' : 'PROF';
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const code = `${prefix}-${randomSuffix}`;
    const cleanName = targetName.trim();
    const cleanEmail = targetEmail ? targetEmail.trim().toLowerCase() : null;

    try {
      const rows = await sql`
        INSERT INTO public.invites (
          code,
          type,
          target_name,
          target_email,
          plan,
          personal_id,
          status,
          created_at,
          expires_at
        )
        VALUES (
          ${code},
          ${type},
          ${cleanName},
          ${cleanEmail},
          ${plan},
          ${personalId ? personalId : null}::uuid,
          'PENDENTE',
          NOW(),
          NOW() + INTERVAL '14 days'
        )
        RETURNING *;
      `;

      const created = rows[0];
      return res.status(201).json({
        success: true,
        invite: {
          id: created.id,
          code: created.code,
          type: created.type,
          targetName: created.target_name,
          target_name: created.target_name,
          targetEmail: created.target_email,
          target_email: created.target_email,
          plan: created.plan,
          status: created.status,
          createdAt: created.created_at,
          created_at: created.created_at,
        },
      });
    } catch (err: any) {
      console.error('[API Invites POST] Erro ao criar convite no Neon:', err);
      return res.status(500).json({ error: 'Erro ao registrar convite no banco de dados Neon.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
