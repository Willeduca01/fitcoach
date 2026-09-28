import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';
import crypto from 'crypto';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, email, token, newPassword } = req.body || {};

  try {
    const sql = getDb();

    // 1. Ação de solicitar recuperação (gera token seguro)
    if (action === 'REQUEST') {
      if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
        return res.status(400).json({ error: 'E-mail inválido.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      // Verifica se o usuário existe em profiles
      const users = await sql`
        SELECT id, name, email FROM public.profiles WHERE LOWER(email) = ${cleanEmail} LIMIT 1
      `;

      if (users.length === 0) {
        // Responde com sucesso por segurança (impedir enumeração de usuários)
        return res.status(200).json({ success: true, message: 'Se o e-mail existir, as instruções foram enviadas.' });
      }

      // Gera token de redefinição de 32 bytes
      const resetToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validade

      // Salva ou atualiza token no banco (cria tabela de tokens se não existir)
      await sql`
        CREATE TABLE IF NOT EXISTS public.password_resets (
          email TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      await sql`
        INSERT INTO public.password_resets (email, token, expires_at)
        VALUES (${cleanEmail}, ${resetToken}, ${expiresAt.toISOString()})
        ON CONFLICT (email) DO UPDATE
        SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = NOW();
      `;

      return res.status(200).json({
        success: true,
        resetToken,
        message: 'Token de recuperação gerado com sucesso.',
      });
    }

    // 2. Ação de validação de token ou redefinição direta
    if (action === 'VERIFY') {
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token não fornecido.' });
      }

      await sql`
        CREATE TABLE IF NOT EXISTS public.password_resets (
          email TEXT PRIMARY KEY,
          token TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `;

      const records = await sql`
        SELECT email, expires_at FROM public.password_resets
        WHERE token = ${token.trim()} AND expires_at > NOW()
        LIMIT 1
      `;

      if (records.length === 0) {
        return res.status(400).json({ valid: false, error: 'Token inválido ou expirado.' });
      }

      return res.status(200).json({ valid: true, email: records[0].email });
    }

    // 3. Ação de atualizar a senha
    if (action === 'RESET') {
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      let userEmail = email ? email.trim().toLowerCase() : null;

      // Se passou token, valida token e extrai email
      if (token) {
        const records = await sql`
          SELECT email FROM public.password_resets
          WHERE token = ${token.trim()} AND expires_at > NOW()
          LIMIT 1
        `;
        if (records.length === 0) {
          return res.status(400).json({ error: 'Link de redefinição expirado ou inválido.' });
        }
        userEmail = records[0].email;
      }

      if (!userEmail) {
        return res.status(400).json({ error: 'E-mail ou token de autorização obrigatório.' });
      }

      // Atualiza a senha no profiles usando pgcrypto crypt()
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;

      await sql`
        UPDATE public.profiles
        SET password_hash = crypt(${newPassword}, gen_salt('bf')),
            updated_at = NOW()
        WHERE LOWER(email) = ${userEmail}
      `;

      // Atualiza também em auth.users se existir
      try {
        await sql`
          UPDATE auth.users
          SET encrypted_password = crypt(${newPassword}, gen_salt('bf')),
              updated_at = NOW()
          WHERE LOWER(email) = ${userEmail}
        `;
      } catch {}

      // Limpa token usado
      try {
        await sql`DELETE FROM public.password_resets WHERE email = ${userEmail};`;
      } catch {}

      return res.status(200).json({
        success: true,
        message: 'Senha alterada com sucesso! Você já pode entrar com a nova senha.',
      });
    }

    return res.status(400).json({ error: 'Ação inválida.' });
  } catch (err: any) {
    console.error('[reset-password] Erro:', err);
    return res.status(500).json({ error: err.message || 'Erro interno ao processar redefinição de senha.' });
  }
}
