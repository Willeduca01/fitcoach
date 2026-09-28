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
  const supabaseUrl = env.VITE_SUPABASE_URL || 'https://xmpbzpdggsonzftueynw.supabase.co';
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
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

              // Se for redefinição de senha, gera o link seguro com token criptográfico do Supabase
              if (body.type === 'PASSWORD_RESET' && serviceRoleKey) {
                try {
                  const { createClient } = await import('@supabase/supabase-js');
                  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
                  const origin = req.headers.origin || 'http://localhost:5173';
                  const basePath = '/fitcoach';
                  const redirectTo = `${origin}${basePath}/?type=recovery`;

                  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'recovery',
                    email: to,
                    options: { redirectTo },
                  });

                  if (!linkError && linkData?.properties?.action_link) {
                    const actionLink = linkData.properties.action_link;
                    console.log('[EmailServer] Link de recuperação oficial gerado pelo Supabase Admin:', actionLink);
                    html = html.replaceAll('__FITCOACH_RESET_URL__', actionLink);
                    html = html.replace(/https?:\/\/[^"'\s]+#\/redefinir-senha[^"'\s]*/g, actionLink);
                    html = html.replace(/href=""/g, `href="${actionLink}"`);
                    html = html.replace(/href=''/g, `href='${actionLink}'`);
                  } else {
                    console.warn('[EmailServer] Erro ao gerar link pelo Supabase Admin:', linkError);
                  }
                } catch (adminErr) {
                  console.warn('[EmailServer] Falha ao processar Supabase Admin:', adminErr);
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

              if (!serviceRoleKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' }));
                return;
              }

              const { createClient } = await import('@supabase/supabase-js');
              const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
              const cleanEmail = String(email).trim().toLowerCase();

              const { data: existingStudent, error: findError } = await supabaseAdmin
                .from('students')
                .select('id, name, user_id, personal_id')
                .eq('email', cleanEmail)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (findError) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: findError.message }));
                return;
              }

              if (!existingStudent) {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Nenhuma ficha de aluno encontrada com este e-mail.' }));
                return;
              }

              const { error: updateError } = await supabaseAdmin
                .from('students')
                .update({ user_id: userId, updated_at: new Date().toISOString() })
                .eq('id', existingStudent.id);

              if (updateError) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: updateError.message }));
                return;
              }

              await supabaseAdmin
                .from('profiles')
                .update({ role: 'STUDENT' })
                .eq('id', userId);

              console.log(`[vite:link-student] Aluno ${existingStudent.name} vinculado com sucesso ao user_id ${userId}`);

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
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://images.unsplash.com https://*.supabase.co https://*.amazonaws.com https:; media-src 'self' data: blob: https://*.supabase.co https://*.amazonaws.com https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.resend.com https://api64.ipify.org https://api.ipify.org https://*.amazonaws.com https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';",
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
