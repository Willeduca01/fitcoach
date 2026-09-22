import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, getSupabaseAdmin } from './_utils/auth';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Endpoint serverless para vincular conta recém-autenticada (aluno)
 * à ficha de aluno pré-cadastrada no CRM pelo Personal Trainer.
 * Blindado contra BOLA (Broken Object Level Authorization) e IDOR.
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

  if (!UUID_REGEX.test(cleanUserId)) {
    return res.status(400).json({ error: 'Identificador userId inválido (deve ser um UUID v4).' });
  }

  // 1. Blindagem BOLA/IDOR: Autenticação obrigatória do solicitante
  const authCtx = await authenticateRequest(req);
  if (!authCtx) {
    return res.status(401).json({
      error: 'Autenticação necessária para vincular conta.',
      code: 'UNAUTHENTICATED',
    });
  }

  // 2. Blindagem BOLA: O usuário autenticado DEVE ser o proprietário do ID e e-mail informados
  // Impede que um usuário mal-intencionado passe o UUID ou e-mail de outra pessoa
  const isOwner = authCtx.user.id === cleanUserId;
  const isMasterUser = authCtx.role === 'MASTER';
  const emailMatches = authCtx.user.email?.trim().toLowerCase() === cleanEmail;

  if (!isMasterUser && (!isOwner || !emailMatches)) {
    return res.status(403).json({
      error: 'Acesso negado: Proibido vincular registros pertencentes a terceiros (BOLA/IDOR Violation).',
      code: 'FORBIDDEN_OBJECT_ACCESS',
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 3. Procura registro de aluno na tabela students pelo e-mail
    const { data: existingStudent, error: findError } = await supabaseAdmin
      .from('students')
      .select('id, name, user_id, personal_id')
      .eq('email', cleanEmail)
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

    // 4. Blindagem Anti-Sequestro de Conta: Impede sobrescrever vínculo se já estiver associado a outra conta
    if (existingStudent.user_id && existingStudent.user_id !== cleanUserId && !isMasterUser) {
      return res.status(409).json({
        error: 'Conflito de integridade: Esta ficha já está vinculada a outra conta ativa.',
        code: 'STUDENT_ALREADY_LINKED',
      });
    }

    // 5. Atualiza o user_id do aluno na tabela students
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

    // 6. Garante que o perfil do usuário em profiles tenha role = 'STUDENT'
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
