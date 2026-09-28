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

      // 2. Perfil profissional
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

  // 2. POST: Ações de mutação e atualização no Neon Postgres
  if (req.method === 'POST') {
    const { action, userId } = req.body || {};

    if (!userId && !action) {
      return res.status(400).json({ error: 'userId obrigatório.' });
    }

    try {
      // --- Adicionar Aluno ---
      if (action === 'ADD_STUDENT') {
        const { personalId, student } = req.body;
        const rows = await sql`
          INSERT INTO public.students (
            personal_id, name, email, phone, avatar_url, status, plan,
            monthly_fee, due_day, payment_status, start_date, primary_goal, notes
          )
          VALUES (
            ${personalId}::uuid, ${student.name}, ${student.email || null}, ${student.phone || null},
            ${student.avatarUrl || null}, ${student.status || 'ATIVO'}, ${student.plan || 'MENSAL'},
            ${student.monthlyFee || 0}, ${student.dueDay || 10}, ${student.paymentStatus || 'EM_DIA'},
            ${student.startDate || new Date().toISOString().split('T')[0]},
            ${student.primaryGoal || 'Condicionamento Físico'}, ${student.notes || null}
          )
          RETURNING *;
        `;
        return res.status(201).json({ success: true, student: rows[0] });
      }

      // --- Atualizar Aluno ---
      if (action === 'UPDATE_STUDENT') {
        const { studentId, student } = req.body;
        await sql`
          UPDATE public.students
          SET name = COALESCE(${student.name}, name),
              email = ${student.email || null},
              phone = ${student.phone || null},
              avatar_url = ${student.avatarUrl || null},
              status = COALESCE(${student.status}, status),
              plan = COALESCE(${student.plan}, plan),
              monthly_fee = COALESCE(${student.monthlyFee}, monthly_fee),
              due_day = COALESCE(${student.dueDay}, due_day),
              payment_status = COALESCE(${student.paymentStatus}, payment_status),
              primary_goal = COALESCE(${student.primaryGoal}, primary_goal),
              notes = ${student.notes || null},
              updated_at = NOW()
          WHERE id = ${studentId}::uuid;
        `;
        return res.status(200).json({ success: true });
      }

      // --- Excluir Aluno ---
      if (action === 'DELETE_STUDENT') {
        const { studentId } = req.body;
        await sql`DELETE FROM public.workouts WHERE student_id = ${studentId}::uuid;`;
        await sql`DELETE FROM public.invoices WHERE student_id = ${studentId}::uuid;`;
        await sql`DELETE FROM public.sessions WHERE student_id = ${studentId}::uuid;`;
        await sql`DELETE FROM public.physical_assessments WHERE student_id = ${studentId}::uuid;`;
        await sql`DELETE FROM public.messages WHERE student_id = ${studentId}::uuid;`;
        await sql`DELETE FROM public.students WHERE id = ${studentId}::uuid;`;
        return res.status(200).json({ success: true });
      }

      // --- Adicionar / Atualizar Treino ---
      if (action === 'ADD_WORKOUT') {
        const { studentId, personalId, name, focus, exercises } = req.body;
        const rows = await sql`
          INSERT INTO public.workouts (student_id, personal_id, name, focus, exercises)
          VALUES (${studentId}::uuid, ${personalId}::uuid, ${name}, ${focus}, ${JSON.stringify(exercises || [])})
          RETURNING *;
        `;
        return res.status(201).json({ success: true, workout: rows[0] });
      }

      if (action === 'UPDATE_WORKOUT') {
        const { routineId, name, focus, exercises } = req.body;
        await sql`
          UPDATE public.workouts
          SET name = COALESCE(${name}, name),
              focus = COALESCE(${focus}, focus),
              exercises = ${JSON.stringify(exercises || [])},
              updated_at = NOW()
          WHERE id = ${routineId}::uuid;
        `;
        return res.status(200).json({ success: true });
      }

      if (action === 'DELETE_WORKOUT') {
        const { routineId } = req.body;
        await sql`DELETE FROM public.workouts WHERE id = ${routineId}::uuid;`;
        return res.status(200).json({ success: true });
      }

      // --- Avaliação Física ---
      if (action === 'ADD_ASSESSMENT') {
        const { studentId, personalId, assessment } = req.body;
        const rows = await sql`
          INSERT INTO public.physical_assessments (
            student_id, personal_id, date, weight_kg, height_cm,
            body_fat_percentage, chest_cm, arms_cm, waist_cm, hips_cm, thighs_cm, notes
          )
          VALUES (
            ${studentId}::uuid, ${personalId}::uuid,
            ${assessment.date || new Date().toISOString().split('T')[0]},
            ${assessment.weightKg || assessment.weight || null},
            ${assessment.heightCm || null},
            ${assessment.bodyFatPercentage || assessment.bodyFat || null},
            ${assessment.chestCm || null},
            ${assessment.armsCm || null},
            ${assessment.waistCm || null},
            ${assessment.hipsCm || null},
            ${assessment.thighsCm || null},
            ${assessment.notes || null}
          )
          RETURNING *;
        `;
        return res.status(201).json({ success: true, assessment: rows[0] });
      }

      // --- Sessões / Aulas ---
      if (action === 'ADD_SESSION') {
        const { studentId, personalId, session } = req.body;
        const rows = await sql`
          INSERT INTO public.sessions (
            student_id, personal_id, date, time, duration_minutes,
            status, location, workout_routine_id, routine_name, notes
          )
          VALUES (
            ${studentId}::uuid, ${personalId}::uuid, ${session.date}, ${session.time},
            ${session.durationMinutes || 60}, ${session.status || 'AGENDADA'},
            ${session.location || null}, ${session.workoutRoutineId || null},
            ${session.routineName || null}, ${session.notes || null}
          )
          RETURNING *;
        `;
        return res.status(201).json({ success: true, session: rows[0] });
      }

      if (action === 'UPDATE_SESSION_STATUS') {
        const { sessionId, status } = req.body;
        await sql`
          UPDATE public.sessions
          SET status = ${status}
          WHERE id = ${sessionId}::uuid;
        `;
        return res.status(200).json({ success: true });
      }

      // --- Faturas ---
      if (action === 'ADD_INVOICE') {
        const { studentId, personalId, invoice } = req.body;
        const rows = await sql`
          INSERT INTO public.invoices (student_id, personal_id, amount, due_date, status, paid_date, payment_method)
          VALUES (
            ${studentId}::uuid, ${personalId}::uuid, ${invoice.amount}, ${invoice.dueDate},
            ${invoice.status || 'PENDENTE'}, ${invoice.paidDate || null}, ${invoice.paymentMethod || 'PIX'}
          )
          RETURNING *;
        `;
        return res.status(201).json({ success: true, invoice: rows[0] });
      }

      if (action === 'UPDATE_INVOICE_STATUS') {
        const { invoiceId, status, paidDate, paymentMethod } = req.body;
        await sql`
          UPDATE public.invoices
          SET status = ${status},
              paid_date = ${status === 'PAGO' ? (paidDate || new Date().toISOString().split('T')[0]) : null},
              payment_method = COALESCE(${paymentMethod || null}, payment_method),
              updated_at = NOW()
          WHERE id = ${invoiceId}::uuid;
        `;
        return res.status(200).json({ success: true });
      }

      // --- Mensagens ---
      if (action === 'SEND_MESSAGE') {
        const { studentId, personalId, senderRole, senderId, senderName, content, category } = req.body;
        const rows = await sql`
          INSERT INTO public.messages (
            student_id, personal_id, sender_role, sender_id, sender_name, content, category, read
          )
          VALUES (
            ${studentId}::uuid, ${personalId}::uuid, ${senderRole || 'PERSONAL'},
            ${senderId}::uuid, ${senderName || 'FitCoach'}, ${content || ''},
            ${category || 'GERAL'}, false
          )
          RETURNING *;
        `;
        return res.status(201).json({ success: true, message: rows[0] });
      }

      if (action === 'MARK_MESSAGES_READ') {
        const { studentId, personalId, senderRole } = req.body;
        await sql`
          UPDATE public.messages
          SET read = true
          WHERE student_id = ${studentId}::uuid
            AND personal_id = ${personalId}::uuid
            AND sender_role = ${senderRole};
        `;
        return res.status(200).json({ success: true });
      }

      // --- Atualização de Perfil (Personal) Padrão ---
      const { name, phone, avatarUrl, title, cref, bio, pixKey, pixType } = req.body;

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
      console.error('[API app-data POST] Erro ao sincronizar dados no Neon:', err);
      return res.status(500).json({ error: err.message || 'Erro ao sincronizar com Neon.' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
