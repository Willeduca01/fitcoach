import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Plugin seguro do Vite para interceptar chamadas ao Resend no servidor local Node.js
 * Evita bloqueios de CORS e consome a chave RESEND_API_KEY do arquivo .env local
 */
function emailServerPlugin(): Plugin {
  const env = loadEnv('development', process.cwd(), '');
  const resendApiKey = env.RESEND_API_KEY || process.env.RESEND_API_KEY;
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
              const { to, subject, html } = body;

              if (!to || !html) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Campos to e html são obrigatórios.' }));
                return;
              }

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
