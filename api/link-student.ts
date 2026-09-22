import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Endpoint serverless para vincular conta recém-autenticada (aluno)
 * à ficha de aluno pré-cadastrada no CRM pelo Personal Trainer.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cabeçalhos de Segurança Estritos (OWASP)
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

  // Validação estrita de formato contra CRLF e injeções
  if (/[\r\n]/.test(cleanEmail) || !EMAIL_REGEX.test(cleanEmail)) {
    return res.status(400).json({ error: 'Formato de e-mail inválido.' });
  }

  if (cleanUserId.length > 128 || /[\x00-\x1F\x7F]/.test(cleanUserId)) {
    return res.status(400).json({ error: 'Identificador userId inválido.' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://xmpbzpdggsonzftueynw.supabase.co';

  if (!serviceRoleKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.' });
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // 1. Procura registro de aluno na tabela students pelo e-mail
    const { data: existingStudent, error: findError } = await supabaseAdmin
      .from('students')
      .select('id, name, user_id, personal_id')
      .ilike('email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findError) {
      console.error('[link-student] Erro ao buscar aluno:', findError);
      return res.status(500).json({ error: 'Erro ao consultar registro do aluno.' });
    }

    if (!existingStudent) {
      return res.status(404).json({ error: 'Nenhuma ficha de aluno encontrada com este e-mail.' });
    }

    // 2. Atualiza o user_id do aluno na tabela students
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({
        user_id: cleanUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingStudent.id);

    if (updateError) {
      console.error('[link-student] Erro ao vincular user_id:', updateError);
      return res.status(500).json({ error: 'Falha ao atualizar registro do aluno.' });
    }

    // 3. Garante que o perfil do usuário em profiles tenha role = 'STUDENT'
    await supabaseAdmin
      .from('profiles')
      .update({ role: 'STUDENT' })
      .eq('id', cleanUserId);

    console.log(`[link-student] Aluno vinculado com sucesso: ${existingStudent.name} (${existingStudent.id}) -> user_id: ${cleanUserId}`);

    return res.status(200).json({
      success: true,
      studentId: existingStudent.id,
      personalId: existingStudent.personal_id,
      name: existingStudent.name,
    });
  } catch (err: any) {
    console.error('[link-student] Erro inesperado:', err);
    return res.status(500).json({ error: 'Erro interno ao vincular aluno.' });
  }
}
