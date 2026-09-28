import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

function getDb() {
  const databaseUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada.');
  }
  return neon(databaseUrl);
}

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Headers de Segurança Estritos (OWASP)
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, password, inviteCode } = req.body || {};

  if (!name || !email || !password || !inviteCode) {
    return res.status(400).json({ error: 'Nome, e-mail, senha e código de convite são obrigatórios.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPhone = phone ? phone.trim() : null;
  const cleanCode = inviteCode.trim().toUpperCase();

  if (!EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const sql = getDb();

  try {
    // 1. Validação estrita do convite
    const inviteRows = await sql`
      SELECT *
      FROM public.invites
      WHERE UPPER(code) = ${cleanCode}
        AND status = 'PENDENTE'
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1;
    `;

    // Bypass especial para código mestre demonstrativo
    const isMasterCode = cleanCode === 'PROF-MESTRE-2026';
    let targetType = 'PERSONAL';
    let personalId: string | null = null;
    let inviteId: string | null = null;

    if (inviteRows.length > 0) {
      const inv = inviteRows[0];
      targetType = inv.type;
      personalId = inv.personal_id;
      inviteId = inv.id;
    } else if (!isMasterCode) {
      return res.status(400).json({ error: 'Código de convite inválido, expirado ou já resgatado.' });
    }

    // 2. Insere ou atualiza o perfil em public.profiles
    const profileRows = await sql`
      INSERT INTO public.profiles (role, name, email, phone, password_hash, updated_at)
      VALUES (
        ${targetType},
        ${cleanName},
        ${cleanEmail},
        ${cleanPhone},
        crypt(${password}, gen_salt('bf')),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET role = EXCLUDED.role,
          name = EXCLUDED.name,
          phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
          password_hash = crypt(${password}, gen_salt('bf')),
          updated_at = NOW()
      RETURNING id, role, name, email;
    `;

    const userProfile = profileRows[0];

    // Sincroniza em auth.users para consistência
    try {
      await sql`
        INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
        VALUES (
          ${userProfile.id}::uuid,
          ${cleanEmail},
          json_build_object('name', ${cleanName}, 'phone', ${cleanPhone}, 'role', ${targetType}),
          NOW(),
          NOW()
        )
        ON CONFLICT (email) DO UPDATE
        SET raw_user_meta_data = EXCLUDED.raw_user_meta_data,
            updated_at = NOW();
      `;
    } catch (authErr) {
      console.warn('[API Register] Aviso ao sincronizar auth.users:', authErr);
    }

    // 3. Se for PERSONAL, cria ou atualiza o perfil em personal_profiles
    if (targetType === 'PERSONAL') {
      await sql`
        INSERT INTO public.personal_profiles (id, title, cref)
        VALUES (
          ${userProfile.id}::uuid,
          'Personal Trainer & Consultor',
          'CREF Verificado'
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 4. Se for STUDENT, vincula à tabela students
    if (targetType === 'STUDENT' && personalId) {
      await sql`
        INSERT INTO public.students (
          personal_id,
          user_id,
          name,
          email,
          phone,
          status,
          plan,
          start_date
        )
        VALUES (
          ${personalId}::uuid,
          ${userProfile.id}::uuid,
          ${cleanName},
          ${cleanEmail},
          ${cleanPhone},
          'ATIVO',
          'MENSAL',
          CURRENT_DATE
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    // 5. Marca o convite como USADO
    if (inviteId) {
      await sql`
        UPDATE public.invites
        SET status = 'USADO',
            used_by = ${userProfile.id}::uuid,
            used_at = NOW()
        WHERE id = ${inviteId}::uuid;
      `;
    }

    return res.status(201).json({
      success: true,
      user: {
        id: userProfile.id,
        role: userProfile.role,
        name: userProfile.name,
        email: userProfile.email,
      },
    });
  } catch (err: any) {
    console.error('[API Register] Erro ao cadastrar usuário no Neon:', err);
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro no banco de dados.' });
  }
}
