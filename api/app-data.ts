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

  const sql = getDb();

  // 1. GET: Carrega todos os dados do usuário autenticado no Neon Postgres
  if (req.method === 'GET') {
    const rawUserId = req.query.userId;
    const rawEmail = req.query.email;

    if (!rawUserId && !rawEmail) {
      return res.status(400).json({ error: 'userId ou email obrigatório.' });
    }

    const userId = typeof rawUserId === 'string' ? rawUserId.trim() : null;
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : null;

    try {
      // 1. Perfil em profiles
      const profileRows = await sql`
        SELECT id, role, name, email, phone, avatar_url, created_at, updated_at
        FROM public.profiles
        WHERE (${userId ? sql`id = ${userId}::uuid` : sql`FALSE`}
           OR ${email ? sql`LOWER(email) = ${email}` : sql`FALSE`})
        LIMIT 1;
      `;

      if (profileRows.length === 0) {
        return res.status(404).json({ error: 'Perfil não encontrado no Neon.' });
      }

      const profile = profileRows[0];
      const effectiveId = profile.id;
      const isStudent = profile.role === 'STUDENT';

      // 2. Perfil profissional (se PERSONAL) ou do treinador (se STUDENT)
      let personalData: any = null;
      if (!isStudent) {
        const pRows = await sql`
          SELECT title, cref, bio, pix_key, pix_type
          FROM public.personal_profiles
          WHERE id = ${effectiveId}::uuid
          LIMIT 1;
        `;
        personalData = pRows[0] || null;
      }

      // 3. Alunos
      let studentsRows: any[] = [];
      if (isStudent) {
        studentsRows = await sql`
          SELECT * FROM public.students
          WHERE user_id = ${effectiveId}::uuid OR LOWER(email) = ${profile.email}
          ORDER BY created_at DESC;
        `;
      } else {
        studentsRows = await sql`
          SELECT * FROM public.students
          WHERE personal_id = ${effectiveId}::uuid
          ORDER BY created_at DESC;
        `;
      }

      // 4. Sessões
      const sessionsRows = isStudent
        ? await sql`
            SELECT * FROM public.sessions
            WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid)
            ORDER BY date DESC, time ASC;
          `
        : await sql`
            SELECT * FROM public.sessions
            WHERE personal_id = ${effectiveId}::uuid
            ORDER BY date DESC, time ASC;
          `;

      // 5. Cobranças / Faturas
      const invoicesRows = isStudent
        ? await sql`
            SELECT * FROM public.invoices
            WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid)
            ORDER BY due_date DESC;
          `
        : await sql`
            SELECT * FROM public.invoices
            WHERE personal_id = ${effectiveId}::uuid
            ORDER BY due_date DESC;
          `;

      // 6. Treinos
      const workoutsRows = isStudent
        ? await sql`
            SELECT * FROM public.workouts
            WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid);
          `
        : await sql`
            SELECT * FROM public.workouts
            WHERE personal_id = ${effectiveId}::uuid;
          `;

      // 7. Avaliações Físicas
      const assessmentsRows = isStudent
        ? await sql`
            SELECT * FROM public.physical_assessments
            WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid);
          `
        : await sql`
            SELECT * FROM public.physical_assessments
            WHERE personal_id = ${effectiveId}::uuid;
          `;

      // 8. Mensagens
      const messagesRows = isStudent
        ? await sql`
            SELECT * FROM public.messages
            WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid)
            ORDER BY created_at ASC;
          `
        : await sql`
            SELECT * FROM public.messages
            WHERE personal_id = ${effectiveId}::uuid
            ORDER BY created_at ASC;
          `;

      return res.status(200).json({
        success: true,
        profile,
        personalProfile: personalData,
        students: studentsRows,
        sessions: sessionsRows,
        invoices: invoicesRows,
        workouts: workoutsRows,
        assessments: assessmentsRows,
        messages: messagesRows,
      });
    } catch (err: any) {
      console.error('[API app-data GET] Erro ao buscar dados no Neon:', err);
      return res.status(500).json({ error: 'Erro ao carregar dados do usuário no Neon.' });
    }
  }

  // 2. POST: Atualiza perfil profissional em personal_profiles e profiles
  if (req.method === 'POST') {
    const { userId, name, phone, avatarUrl, title, cref, bio, pixKey, pixType } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId obrigatório.' });
    }

    try {
      if (name || phone || avatarUrl) {
        await sql`
          UPDATE public.profiles
          SET name = COALESCE(${name || null}, name),
              phone = COALESCE(${phone || null}, phone),
              avatar_url = COALESCE(${avatarUrl || null}, avatar_url),
              updated_at = NOW()
          WHERE id = ${userId}::uuid;
        `;
      }

      await sql`
        INSERT INTO public.personal_profiles (id, title, cref, bio, pix_key, pix_type, updated_at)
        VALUES (
          ${userId}::uuid,
          ${title || 'Personal Trainer & Consultor'},
          ${cref || null},
          ${bio || null},
          ${pixKey || null},
          ${pixType || 'EMAIL'},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET title = COALESCE(EXCLUDED.title, public.personal_profiles.title),
            cref = COALESCE(EXCLUDED.cref, public.personal_profiles.cref),
            bio = COALESCE(EXCLUDED.bio, public.personal_profiles.bio),
            pix_key = COALESCE(EXCLUDED.pix_key, public.personal_profiles.pix_key),
            pix_type = COALESCE(EXCLUDED.pix_type, public.personal_profiles.pix_type),
            updated_at = NOW();
      `;

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error('[API app-data POST] Erro ao atualizar perfil no Neon:', err);
      return res.status(500).json({ error: 'Erro ao atualizar perfil no banco.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
