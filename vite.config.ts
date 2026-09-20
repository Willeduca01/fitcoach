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
              let html = body.html;

              if (!to || !html) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Campos to e html são obrigatórios.' }));
                return;
              }

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
                  to,
                  subject: subject || 'Convite de Acesso • FitCoach Pro',
                  html,
                });

                console.log('[EmailServer] E-mail enviado com sucesso via Gmail SMTP:', info.messageId);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, messageId: info.messageId }));
                return;
              }

              // Prioridade 2: Fallback para Resend API
              console.log(`[EmailServer] Enviando convite via Resend para: ${to}`);

              const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${resendApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  from: 'FitCoach Pro <onboarding@resend.dev>',
                  to: [to],
                  subject: subject || 'Convite de Acesso • FitCoach Pro',
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
              if (!userId || !email) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'userId e email são obrigatórios.' }));
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
              const cleanEmail = email.trim().toLowerCase();

              const { data: existingStudent, error: findError } = await supabaseAdmin
                .from('students')
                .select('id, name, user_id, personal_id')
                .ilike('email', cleanEmail)
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

        // Middleware de Rate Limiting por IP local
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
                const { action = 'LOGIN', op = 'check' } = body;
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({
                  ip: clientIp,
                  allowed: true,
                  remainingAttempts: 5,
                  lockoutSeconds: 0,
                  action,
                  op,
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), emailServerPlugin()],
  base: process.env.VERCEL ? '/' : '/fitcoach/',
});
