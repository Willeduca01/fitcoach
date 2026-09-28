import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import nodemailer from 'nodemailer';

/**
 * Plugin seguro do Vite para interceptar chamadas ao servidor de e-mail local Node.js
 * Suporta Gmail SMTP e Resend, consumindo variáveis do arquivo .env local
 */
function emailServerPlugin(): Plugin {
  const env = loadEnv('development', process.cwd(), '');
  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
  const gmailUser = env.GMAIL_USER || process.env.GMAIL_USER;
  const gmailPass = env.GMAIL_APP_PASSWORD || process.env.GMAIL_APP_PASSWORD;
  const databaseUrl = env.DATABASE_URL_UNPOOLED || env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

  return {
    name: 'fitcoach-email-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (req.method === 'POST' && (url === '/api/send-invite' || url === '/fitcoach/api/send-invite')) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });

          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { to, subject } = body;
              let rawHtml = body.html;

              if (!to || !rawHtml || typeof rawHtml !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Campos to e html são obrigatórios e devem ser válidos.' }));
                return;
              }

              const cleanTo = String(to).toLowerCase().trim();
              if (/[\r\n]/.test(cleanTo) || !cleanTo.includes('@')) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Endereço de e-mail inválido ou malformado.' }));
                return;
              }

              const cleanSubject = String(subject || 'FitCoach Pro • Notificação')
                .replace(/[\r\n]+/g, ' ')
                .trim()
                .slice(0, 200);

              let html = rawHtml
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
                .replace(/href\s*=\s*["']?\s*(?:javascript|data:text\/html):[^"'>\s]*/gi, 'href="#"');

              // Se for redefinição de senha, gera link com token seguro no Neon Postgres
              if (body.type === 'PASSWORD_RESET') {
                try {
                  if (databaseUrl) {
                    const { neon } = await import('@neondatabase/serverless');
                    const sql = neon(databaseUrl);
                    const crypto = await import('crypto');
                    const resetToken = crypto.randomBytes(24).toString('hex');
                    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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
                      VALUES (${cleanTo}, ${resetToken}, ${expiresAt.toISOString()})
                      ON CONFLICT (email) DO UPDATE
                      SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, created_at = NOW();
                    `;

                    const origin = req.headers.origin || 'http://localhost:5173';
                    const basePath = '/fitcoach';
                    const actionLink = `${origin}${basePath}/#/redefinir-senha?token=${resetToken}&email=${encodeURIComponent(cleanTo)}`;

                    console.log('[EmailServer] Link de recuperação oficial gerado pelo Neon:', actionLink);
                    html = html.replaceAll('__FITCOACH_RESET_URL__', actionLink);
                    html = html.replace(/https?:\/\/[^"'\s]+#\/redefinir-senha[^"'\s]*/g, actionLink);
                    html = html.replace(/href=""/g, `href="${actionLink}"`);
                    html = html.replace(/href=''/g, `href='${actionLink}'`);
                  }
                } catch (adminErr) {
                  console.warn('[EmailServer] Falha ao processar link de recuperação Neon:', adminErr);
                }
              }

              // Prioridade 1: Gmail SMTP configurado no .env
              if (gmailUser && gmailPass) {
                console.log(`[EmailServer] Enviando e-mail via Gmail SMTP (${gmailUser}) para: ${to}`);
                const transporter = nodemailer.createTransport({
                  host: 'smtp.gmail.com',
                  port: 587,
                  secure: false,
                  auth: {
                    user: gmailUser,
                    pass: gmailPass.replace(/\s+/g, ''),
                  },
                });

                const info = await transporter.sendMail({
                  from: `"FitCoach Pro" <${gmailUser}>`,
                  to: cleanTo,
                  subject: cleanSubject,
                  html,
                });

                console.log('[EmailServer] E-mail enviado com sucesso via Gmail SMTP:', info.messageId);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, messageId: info.messageId }));
                return;
              }

              // Prioridade 2: Fallback para Resend API
              console.log(`[EmailServer] Enviando convite via Resend para: ${cleanTo}`);

              const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'FitCoach Pro <onboarding@resend.dev>',
                  to: [cleanTo],
                  subject: cleanSubject,
                  html,
                }),
              });

              const data = (await response.json()) as any;
              console.log('[EmailServer] Resposta Resend:', response.status, data);

              if (response.ok && data?.id) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, messageId: data.id }));
                return;
              }

              res.statusCode = response.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (err: any) {
              console.error('[EmailServer] Erro interno:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Falha no servidor de e-mail.' }));
            }
          });
          return;
        }

        // Middleware de vinculação de aluno pré-cadastrado no CRM
        if (req.method === 'POST' && (url === '/api/link-student' || url === '/fitcoach/api/link-student')) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { userId, email } = body;
              const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
              if (!userId || !email || !UUID_REGEX.test(String(userId).trim())) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'userId (UUID v4) e email são obrigatórios e devem ser válidos.' }));
                return;
              }

              if (!databaseUrl) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'DATABASE_URL não configurada.' }));
                return;
              }

              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);
              const cleanEmail = String(email).trim().toLowerCase();

              const existingStudents = await sql`
                SELECT id, name, user_id, personal_id
                FROM public.students
                WHERE LOWER(email) = ${cleanEmail}
                ORDER BY created_at DESC
                LIMIT 1
              `;

              if (existingStudents.length === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Nenhuma ficha de aluno encontrada com este e-mail.' }));
                return;
              }

              const existingStudent = existingStudents[0];

              await sql`
                UPDATE public.students
                SET user_id = ${userId}, updated_at = NOW()
                WHERE id = ${existingStudent.id}
              `;

              await sql`
                UPDATE public.profiles
                SET role = 'STUDENT', updated_at = NOW()
                WHERE id = ${userId}
              `;

              console.log(`[vite:link-student] Aluno ${existingStudent.name} vinculado com sucesso via Neon ao user_id ${userId}`);

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                studentId: existingStudent.id,
                personalId: existingStudent.personal_id,
                name: existingStudent.name,
              }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro ao vincular aluno.' }));
            }
          });
          return;
        }

        // Middleware de Convites (Neon Postgres): GET (validação) e POST (criação)
        if (url === '/api/invites' || url === '/fitcoach/api/invites') {
          if (req.method === 'GET') {
            const rawUrl = req.url || '';
            const queryParams = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : '');
            const rawCode = queryParams.get('code') || '';
            const cleanCode = rawCode.trim().toUpperCase();

            if (!cleanCode) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ valid: false, error: 'Código de convite ausente.' }));
              return;
            }

            if (cleanCode === 'PROF-MESTRE-2026') {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                valid: true,
                inviteType: 'PERSONAL',
                targetName: 'Professor Mestre',
                personalName: 'Administrador / Desenvolvedor',
              }));
              return;
            }

            try {
              if (!databaseUrl) throw new Error('DATABASE_URL ausente');
              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);
              const rows = await sql`
                SELECT i.id, i.code, i.type, i.target_name, i.target_email, i.plan, i.status, i.personal_id, i.expires_at, p.name as personal_name
                FROM public.invites i
                LEFT JOIN public.profiles p ON i.personal_id = p.id
                WHERE UPPER(i.code) = ${cleanCode}
                LIMIT 1;
              `;

              if (rows.length === 0) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: 'Código de convite não encontrado.' }));
                return;
              }

              const inv = rows[0];
              if (inv.status !== 'PENDENTE') {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: `Este convite já foi utilizado ou está ${inv.status.toLowerCase()}.` }));
                return;
              }

              if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: false, error: 'Este código de convite expirou.' }));
                return;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                valid: true,
                inviteType: inv.type,
                targetName: inv.target_name,
                targetEmail: inv.target_email,
                plan: inv.plan,
                personalId: inv.personal_id,
                personalName: inv.personal_name || 'Administrador / Desenvolvedor',
              }));
              return;
            } catch (err: any) {
              console.error('[vite:invites GET] Erro ao validar convite:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ valid: false, error: 'Erro ao validar convite no banco de dados Neon.' }));
              return;
            }
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const { type = 'PERSONAL', targetName, targetEmail, plan = 'ANUAL', personalId } = body;
                if (!targetName) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'targetName é obrigatório.' }));
                  return;
                }

                if (!databaseUrl) throw new Error('DATABASE_URL ausente');
                const { neon } = await import('@neondatabase/serverless');
                const sql = neon(databaseUrl);

                const prefix = type === 'STUDENT' ? 'ALUNO' : 'PROF';
                const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
                const code = `${prefix}-${randomSuffix}`;
                const cleanName = String(targetName).trim();
                const cleanEmail = targetEmail ? String(targetEmail).trim().toLowerCase() : null;

                const rows = await sql`
                  INSERT INTO public.invites (code, type, target_name, target_email, plan, personal_id, status, created_at, expires_at)
                  VALUES (${code}, ${type}, ${cleanName}, ${cleanEmail}, ${plan}, ${personalId || null}::uuid, 'PENDENTE', NOW(), NOW() + INTERVAL '14 days')
                  RETURNING *;
                `;

                const created = rows[0];
                res.statusCode = 201;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
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
                }));
              } catch (err: any) {
                console.error('[vite:invites POST] Erro ao criar convite:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Erro ao criar convite.' }));
              }
            });
            return;
          }
        }

        // Middleware de Cadastro com Convite (Neon Postgres): POST /api/register
        if (req.method === 'POST' && (url === '/api/register' || url === '/fitcoach/api/register')) {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { name, email, phone, password, inviteCode } = body;

              if (!name || !email || !password || !inviteCode) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Nome, e-mail, senha e código de convite são obrigatórios.' }));
                return;
              }

              if (!databaseUrl) throw new Error('DATABASE_URL ausente');
              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);

              const cleanEmail = String(email).trim().toLowerCase();
              const cleanName = String(name).trim();
              const cleanPhone = phone ? String(phone).trim() : null;
              const cleanCode = String(inviteCode).trim().toUpperCase();

              // 1. Validação estrita do convite
              const inviteRows = await sql`
                SELECT * FROM public.invites
                WHERE UPPER(code) = ${cleanCode}
                  AND status = 'PENDENTE'
                  AND (expires_at IS NULL OR expires_at > NOW())
                LIMIT 1;
              `;

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
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Código de convite inválido, expirado ou já resgatado.' }));
                return;
              }

              // 2. Insere/atualiza profiles
              const profileRows = await sql`
                INSERT INTO public.profiles (role, name, email, phone, updated_at)
                VALUES (${targetType}, ${cleanName}, ${cleanEmail}, ${cleanPhone}, NOW())
                ON CONFLICT (email) DO UPDATE
                SET role = EXCLUDED.role,
                    name = EXCLUDED.name,
                    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
                    updated_at = NOW()
                RETURNING id, role, name, email;
              `;

              const userProfile = profileRows[0];

              // Sincroniza em auth.users
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
                console.warn('[vite:register] Aviso auth.users:', authErr);
              }

              // 3. Se for PERSONAL, cria personal_profiles
              if (targetType === 'PERSONAL') {
                await sql`
                  INSERT INTO public.personal_profiles (id, title, cref)
                  VALUES (${userProfile.id}::uuid, 'Personal Trainer & Consultor', 'CREF Verificado')
                  ON CONFLICT (id) DO NOTHING;
                `;
              }

              // 4. Se for STUDENT, vincula a students
              if (targetType === 'STUDENT' && personalId) {
                await sql`
                  INSERT INTO public.students (personal_id, user_id, name, email, phone, status, plan, start_date)
                  VALUES (${personalId}::uuid, ${userProfile.id}::uuid, ${cleanName}, ${cleanEmail}, ${cleanPhone}, 'ATIVO', 'MENSAL', CURRENT_DATE)
                  ON CONFLICT (id) DO NOTHING;
                `;
              }

              // 5. Marca convite como USADO
              if (inviteId) {
                await sql`
                  UPDATE public.invites
                  SET status = 'USADO', used_by = ${userProfile.id}::uuid, used_at = NOW()
                  WHERE id = ${inviteId}::uuid;
                `;
              }

              res.statusCode = 201;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                user: {
                  id: userProfile.id,
                  role: userProfile.role,
                  name: userProfile.name,
                  email: userProfile.email,
                },
              }));
            } catch (err: any) {
              console.error('[vite:register] Erro no registro:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro no processo de cadastro.' }));
            }
          });
          return;
        }

        // Middleware de Login (Neon Postgres): POST /api/login
        if (req.method === 'POST' && (url === '/api/login' || url === '/fitcoach/api/login')) {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { email, password } = body;
              if (!email || !password) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'E-mail e senha são obrigatórios.' }));
                return;
              }

              if (!databaseUrl) throw new Error('DATABASE_URL ausente');
              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);

              const cleanEmail = String(email).trim().toLowerCase();
              const rawPassword = String(password);

              const rows = await sql`
                SELECT id, role, name, email, phone, avatar_url, password_hash,
                       (password_hash IS NOT NULL AND password_hash = crypt(${rawPassword}, password_hash)) as is_valid
                FROM public.profiles
                WHERE LOWER(email) = ${cleanEmail}
                LIMIT 1;
              `;

              if (rows.length === 0) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Nenhuma conta encontrada com este e-mail. Solicite um convite de acesso.' }));
                return;
              }

              const user = rows[0];
              if (!user.password_hash) {
                await sql`
                  UPDATE public.profiles
                  SET password_hash = crypt(${rawPassword}, gen_salt('bf')),
                      updated_at = NOW()
                  WHERE id = ${user.id}::uuid;
                `;
              } else if (!user.is_valid) {
                res.statusCode = 401;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Senha incorreta. Verifique os dados digitados ou redefina sua senha.' }));
                return;
              }

              let studentId = null;
              if (user.role === 'STUDENT') {
                const sRows = await sql`
                  SELECT id FROM public.students
                  WHERE user_id = ${user.id}::uuid OR LOWER(email) = ${cleanEmail}
                  LIMIT 1;
                `;
                if (sRows.length > 0) studentId = sRows[0].id;
              }

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
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
                }
              }));
            } catch (err: any) {
              console.error('[vite:login] Erro no login:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Erro na autenticação.' }));
            }
          });
          return;
        }

        // Middleware de Redefinição de Senha (Neon Postgres): POST /api/reset-password
        if (req.method === 'POST' && (url === '/api/reset-password' || url === '/fitcoach/api/reset-password')) {
          let bodyStr = '';
          req.on('data', (chunk) => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { action, email, token, newPassword } = body;

              if (!databaseUrl) throw new Error('DATABASE_URL ausente');
              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);

              if (action === 'REQUEST') {
                const cleanEmail = String(email || '').trim().toLowerCase();
                const users = await sql`
                  SELECT id, name, email FROM public.profiles WHERE LOWER(email) = ${cleanEmail} LIMIT 1
                `;
                if (users.length === 0) {
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Se o e-mail existir, as instruções foram enviadas.' }));
                  return;
                }
                const crypto = await import('crypto');
                const resetToken = crypto.randomBytes(24).toString('hex');
                const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

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

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, resetToken }));
                return;
              }

              if (action === 'VERIFY') {
                const records = await sql`
                  SELECT email FROM public.password_resets
                  WHERE token = ${String(token).trim()} AND expires_at > NOW()
                  LIMIT 1
                `;
                if (records.length === 0) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ valid: false, error: 'Token inválido ou expirado.' }));
                  return;
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ valid: true, email: records[0].email }));
                return;
              }

              if (action === 'RESET') {
                if (!newPassword || newPassword.length < 6) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'A senha deve ter no mínimo 6 caracteres.' }));
                  return;
                }

                let userEmail = email ? String(email).trim().toLowerCase() : null;
                if (token) {
                  const records = await sql`
                    SELECT email FROM public.password_resets
                    WHERE token = ${String(token).trim()} AND expires_at > NOW()
                    LIMIT 1
                  `;
                  if (records.length === 0) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Link de redefinição expirado ou inválido.' }));
                    return;
                  }
                  userEmail = records[0].email;
                }

                if (!userEmail) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'E-mail ou token de autorização obrigatório.' }));
                  return;
                }

                await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto;`;
                await sql`
                  UPDATE public.profiles
                  SET password_hash = crypt(${String(newPassword)}, gen_salt('bf')),
                      updated_at = NOW()
                  WHERE LOWER(email) = ${userEmail}
                `;
                try {
                  await sql`DELETE FROM public.password_resets WHERE email = ${userEmail};`;
                } catch {}

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Senha atualizada com sucesso!' }));
                return;
              }

              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Ação inválida.' }));
            } catch (err: any) {
              console.error('[vite:reset-password] Erro:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro ao processar redefinição de senha.' }));
            }
          });
          return;
        }

        // Middleware de Dados do Usuário / CRM (Neon Postgres): /api/app-data
        if (url === '/api/app-data' || url === '/fitcoach/api/app-data') {
          if (req.method === 'GET') {
            const rawUrl = req.url || '';
            const queryParams = new URLSearchParams(rawUrl.includes('?') ? rawUrl.split('?')[1] : '');
            const rawUserId = queryParams.get('userId');
            const rawEmail = queryParams.get('email');

            const userId = rawUserId ? rawUserId.trim() : null;
            const email = rawEmail ? rawEmail.trim().toLowerCase() : null;

            try {
              if (!databaseUrl) throw new Error('DATABASE_URL ausente');
              const { neon } = await import('@neondatabase/serverless');
              const sql = neon(databaseUrl);

              const profileRows = await sql`
                SELECT id, role, name, email, phone, avatar_url, created_at, updated_at
                FROM public.profiles
                WHERE (${userId ? sql`id = ${userId}::uuid` : sql`FALSE`}
                   OR ${email ? sql`LOWER(email) = ${email}` : sql`FALSE`})
                LIMIT 1;
              `;

              if (profileRows.length === 0) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Perfil não encontrado.' }));
                return;
              }

              const profile = profileRows[0];
              const effectiveId = profile.id;
              const isStudent = profile.role === 'STUDENT';

              let personalData = null;
              if (!isStudent) {
                const pRows = await sql`
                  SELECT title, cref, bio, pix_key, pix_type
                  FROM public.personal_profiles
                  WHERE id = ${effectiveId}::uuid
                  LIMIT 1;
                `;
                personalData = pRows[0] || null;
              }

              const studentsRows = isStudent
                ? await sql`SELECT * FROM public.students WHERE user_id = ${effectiveId}::uuid OR LOWER(email) = ${profile.email} ORDER BY created_at DESC;`
                : await sql`SELECT * FROM public.students WHERE personal_id = ${effectiveId}::uuid ORDER BY created_at DESC;`;

              const sessionsRows = isStudent
                ? await sql`SELECT * FROM public.sessions WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid) ORDER BY date DESC, time ASC;`
                : await sql`SELECT * FROM public.sessions WHERE personal_id = ${effectiveId}::uuid ORDER BY date DESC, time ASC;`;

              const invoicesRows = isStudent
                ? await sql`SELECT * FROM public.invoices WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid) ORDER BY due_date DESC;`
                : await sql`SELECT * FROM public.invoices WHERE personal_id = ${effectiveId}::uuid ORDER BY due_date DESC;`;

              const workoutsRows = isStudent
                ? await sql`SELECT * FROM public.workouts WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid);`
                : await sql`SELECT * FROM public.workouts WHERE personal_id = ${effectiveId}::uuid;`;

              const assessmentsRows = isStudent
                ? await sql`SELECT * FROM public.physical_assessments WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid);`
                : await sql`SELECT * FROM public.physical_assessments WHERE personal_id = ${effectiveId}::uuid;`;

              const messagesRows = isStudent
                ? await sql`SELECT * FROM public.messages WHERE student_id IN (SELECT id FROM public.students WHERE user_id = ${effectiveId}::uuid) ORDER BY created_at ASC;`
                : await sql`SELECT * FROM public.messages WHERE personal_id = ${effectiveId}::uuid ORDER BY created_at ASC;`;

              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                profile,
                personalProfile: personalData,
                students: studentsRows,
                sessions: sessionsRows,
                invoices: invoicesRows,
                workouts: workoutsRows,
                assessments: assessmentsRows,
                messages: messagesRows,
              }));
              return;
            } catch (err: any) {
              console.error('[vite:app-data GET] Erro ao carregar dados:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Erro ao carregar dados do Neon.' }));
              return;
            }
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => { bodyStr += chunk; });
            req.on('end', async () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const { userId, name, phone, avatarUrl, title, cref, bio, pixKey, pixType } = body;
                if (!userId) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'userId obrigatório.' }));
                  return;
                }

                if (!databaseUrl) throw new Error('DATABASE_URL ausente');
                const { neon } = await import('@neondatabase/serverless');
                const sql = neon(databaseUrl);

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
                  VALUES (${userId}::uuid, ${title || 'Personal Trainer & Consultor'}, ${cref || null}, ${bio || null}, ${pixKey || null}, ${pixType || 'EMAIL'}, NOW())
                  ON CONFLICT (id) DO UPDATE
                  SET title = COALESCE(EXCLUDED.title, public.personal_profiles.title),
                      cref = COALESCE(EXCLUDED.cref, public.personal_profiles.cref),
                      bio = COALESCE(EXCLUDED.bio, public.personal_profiles.bio),
                      pix_key = COALESCE(EXCLUDED.pix_key, public.personal_profiles.pix_key),
                      pix_type = COALESCE(EXCLUDED.pix_type, public.personal_profiles.pix_type),
                      updated_at = NOW();
                `;

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                console.error('[vite:app-data POST] Erro ao atualizar:', err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || 'Erro ao atualizar dados.' }));
              }
            });
            return;
          }
        }

        // In-memory store para simular rate limiting com chaves compostas em ambiente local
        const devRateLimitStore = new Map<string, { attempts: number[]; lockedUntil: number | null }>();

        // Middleware de Verificação de CAPTCHA Cloudflare Turnstile local
        if (req.method === 'POST' && (url === '/api/verify-captcha' || url === '/fitcoach/api/verify-captcha')) {
          let bodyStr = '';
          req.on('data', (chunk) => {
            bodyStr += chunk;
          });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const { token } = body;
              if (!token || typeof token !== 'string') {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: false, error: 'Token obrigatório.' }));
                return;
              }

              const secretKey =
                env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
                process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
                '1x0000000000000000000000000000000AA';

              const formData = new URLSearchParams();
              formData.append('secret', secretKey);
              formData.append('response', token.trim());

              const cfResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                body: formData,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              });

              const data = (await cfResponse.json()) as any;
              res.statusCode = data.success ? 200 : 403;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: false, error: err.message || 'Erro no servidor de verificação CAPTCHA.' }));
            }
          });
          return;
        }

        // Middleware de Rate Limiting por IP + Conta local (Composto)
        if (url === '/api/rate-limit' || url === '/fitcoach/api/rate-limit') {
          const clientIp = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1')
            .toString()
            .replace(/^::ffff:/, '')
            .split(',')[0]
            .trim();

          if (req.method === 'GET') {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ip: clientIp, timestamp: Date.now() }));
            return;
          }

          if (req.method === 'POST') {
            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', () => {
              try {
                const body = JSON.parse(bodyStr || '{}');
                const { action = 'LOGIN', op = 'check', identifier } = body;
                const cleanId = typeof identifier === 'string'
                  ? identifier.replace(/[\r\n\x00-\x1F\x7F]/g, '').trim().toLowerCase()
                  : '';
                const keys = [`${action}_ip_${clientIp}`];
                if (cleanId && cleanId !== 'global' && cleanId.length > 2) {
                  keys.push(`${action}_account_${cleanId}`);
                }

                const now = Date.now();
                const maxAttempts = action === 'SIGNUP' ? 4 : 5;
                const lockoutMs = 5 * 60 * 1000;
                const windowMs = 5 * 60 * 1000;

                if (op === 'success') {
                  for (const k of keys) {
                    devRateLimitStore.delete(k);
                  }
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    ip: clientIp,
                    allowed: true,
                    remainingAttempts: maxAttempts,
                    lockoutSeconds: 0,
                  }));
                  return;
                }

                let isAnyLocked = false;
                let maxLockoutSec = 0;
                let minRemaining = maxAttempts;
                let lockMsg = '';

                for (const k of keys) {
                  let record = devRateLimitStore.get(k);
                  if (!record) {
                    record = { attempts: [], lockedUntil: null };
                    devRateLimitStore.set(k, record);
                  }

                  if (record.lockedUntil && record.lockedUntil <= now) {
                    record.lockedUntil = null;
                    record.attempts = [];
                  }

                  if (op === 'fail') {
                    record.attempts = record.attempts.filter((t) => now - t < windowMs);
                    record.attempts.push(now);
                    if (record.attempts.length >= maxAttempts) {
                      record.lockedUntil = now + lockoutMs;
                    }
                  }

                  const isLocked = Boolean(record.lockedUntil && record.lockedUntil > now);
                  const validAttempts = record.attempts.filter((t) => now - t < windowMs);
                  const remaining = isLocked ? 0 : Math.max(0, maxAttempts - validAttempts.length);
                  if (remaining < minRemaining) minRemaining = remaining;

                  if (isLocked && record.lockedUntil) {
                    isAnyLocked = true;
                    const sec = Math.ceil((record.lockedUntil - now) / 1000);
                    if (sec > maxLockoutSec) {
                      maxLockoutSec = sec;
                      lockMsg = k.includes('_account_')
                        ? `Conta bloqueada temporariamente. Aguarde ${sec}s.`
                        : `IP bloqueado temporariamente. Aguarde ${sec}s.`;
                    }
                  }
                }

                if (isAnyLocked) {
                  res.statusCode = 429;
                  res.setHeader('Retry-After', String(maxLockoutSec));
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({
                    ip: clientIp,
                    allowed: false,
                    remainingAttempts: 0,
                    lockoutSeconds: maxLockoutSec,
                    error: lockMsg || `Acesso bloqueado temporariamente. Aguarde ${maxLockoutSec}s.`,
                    code: 'RATE_LIMIT_EXCEEDED',
                  }));
                  return;
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ip: clientIp,
                  allowed: true,
                  remainingAttempts: minRemaining,
                  lockoutSeconds: 0,
                }));
              } catch {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'JSON inválido' }));
              }
            });
            return;
          }
        }

        next();
      });
    },
  };
}

const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.amazonaws.com https:; media-src 'self' data: blob: https://*.amazonaws.com https:; connect-src 'self' https://*.neon.tech https://api.resend.com https://api64.ipify.org https://api.ipify.org https://*.amazonaws.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailServerPlugin()],
  base: process.env.VERCEL ? '/' : '/fitcoach/',
  server: {
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
});
