import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import { authenticateRequest } from './_utils/auth';

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

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Endpoint serverless para vincular conta recém-autenticada (aluno)
 * à ficha de aluno pré-cadastrada no CRM pelo Personal Trainer.
 * Conectado ao Neon Postgres.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body || {};

  if (!userId || !email || typeof userId !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'userId e email são obrigatórios e devem ser válidos.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanUserId = userId.trim();

  if (/[\r\n]/.test(cleanEmail) || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  if (!UUID_REGEX.test(cleanUserId) && cleanUserId !== 'demo-student-id') {
    return res.status(400).json({ error: 'Identificador userId inválido (deve ser um UUID v4).' });
  }

  try {
    const sql = getDb();

    // 1. Procura registro de aluno na tabela students pelo e-mail
    const existingStudents = await sql`
      SELECT id, name, user_id, personal_id
      FROM public.students
      WHERE LOWER(email) = ${cleanEmail}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existingStudents.length === 0) {
      return res.status(404).json({ error: 'Nenhuma ficha de aluno encontrada com este e-mail.' });
    }

    const existingStudent = existingStudents[0];

    // 2. Blindagem Anti-Sequestro de Conta
    if (existingStudent.user_id && existingStudent.user_id !== cleanUserId) {
      return res.status(409).json({
        error: 'Conflito de integridade: Esta ficha já está vinculada a outra conta ativa.',
        code: 'STUDENT_ALREADY_LINKED',
      });
    }

    // 3. Atualiza o user_id do aluno na tabela students
    await sql`
      UPDATE public.students
      SET user_id = ${cleanUserId}, updated_at = NOW()
      WHERE id = ${existingStudent.id}
    `;

    // 4. Garante que o perfil do usuário em profiles tenha role = 'STUDENT'
    await sql`
      UPDATE public.profiles
      SET role = 'STUDENT', updated_at = NOW()
      WHERE id = ${cleanUserId}
    `;

    console.log(`[link-student] Aluno vinculado no Neon: ${existingStudent.name} (${existingStudent.id}) -> user_id: ${cleanUserId}`);

    return res.status(200).json({
      success: true,
      studentId: existingStudent.id,
      personalId: existingStudent.personal_id,
      name: existingStudent.name,
    });
  } catch (err: any) {
    console.error('[link-student] Erro:', err);
    return res.status(500).json({ error: 'Erro interno ao vincular aluno.' });
  }
}
