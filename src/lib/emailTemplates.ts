/**
 * Templates HTML de E-mail em Dark Mode para o FitCoach Pro
 * Compatível com Gmail, Outlook, Apple Mail e clientes modernos.
 */

export interface InviteEmailData {
  toName: string;
  toEmail: string;
  inviteCode: string;
  inviteUrl: string;
  role: 'trainer' | 'student' | 'PERSONAL' | 'STUDENT';
  trainerName?: string;
  planName?: string;
  expiresInDays?: number;
}

export function generateInviteEmailHtml(data: InviteEmailData): { subject: string; html: string } {
  const isTrainer = data.role === 'trainer' || data.role === 'PERSONAL';
  const accentColor = isTrainer ? '#f59e0b' : '#10b981';
  const accentLight = isTrainer ? '#fbbf24' : '#34d399';
  const expiresIn = data.expiresInDays || 14;

  const subject = isTrainer
    ? `FitCoach Pro: Seu convite de Treinador chegou! (Código: ${data.inviteCode})`
    : `FitCoach Pro: ${data.trainerName || 'Seu Treinador'} convidou você para treinar!`;

  const headerBadgeText = isTrainer
    ? 'CONVITE EXCLUSIVO PARA TREINADOR'
    : 'CONVITE DE ALUNO VINCULADO';

  const welcomeHeading = `Olá, ${data.toName}!`;

  const leadParagraph = isTrainer
    ? 'Você foi convidado pelo <strong>Desenvolvedor / Administrador Master</strong> para gerenciar seus alunos, prescrever treinos inteligentes e acompanhar métricas no <strong>FitCoach Pro</strong>.'
    : `Seu Personal Trainer <strong>${data.trainerName || 'Personal Trainer'}</strong> preparou seu acesso exclusivo no <strong>FitCoach Pro</strong> para você acessar seus treinos, avaliações físicas e evolução em tempo real.`;

  const planInfo = data.planName
    ? `<div style="margin-top: 12px; padding: 10px 16px; background-color: #27272a; border-radius: 8px; font-size: 13px; color: #a1a1aa;">
        Plano Vinculado: <strong style="color: #ffffff;">${data.planName}</strong>
       </div>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="background-color: #09090b; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f4f4f5;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #09090b; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 580px; background-color: #18181b; border-radius: 24px; border: 1px solid #27272a; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          <tr>
            <td style="padding: 36px 36px 20px 36px; text-align: center; border-bottom: 1px solid #27272a;">
              <div style="margin-bottom: 12px;">
                <span style="font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">FitCoach <span style="color: ${accentLight};">Pro</span></span>
              </div>
              <div>
                <span style="display: inline-block; padding: 6px 14px; background-color: ${isTrainer ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; border: 1px solid ${accentColor}; border-radius: 9999px; color: ${accentLight}; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;">${headerBadgeText}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">
                ${welcomeHeading}
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #d4d4d8;">
                ${leadParagraph}
              </p>

              ${planInfo}

              <div style="background-color: #09090b; border: 2px dashed #3f3f46; border-radius: 16px; padding: 20px 24px; text-align: center; margin: 24px 0;">
                <div style="font-size: 11px; text-transform: uppercase; color: #a1a1aa; letter-spacing: 1px; margin-bottom: 8px; font-weight: 600;">
                  Seu Código de Autorização
                </div>
                <div style="font-family: Consolas, 'Liberation Mono', Courier, monospace; font-size: 26px; font-weight: 800; color: ${accentLight}; letter-spacing: 3px;">
                  ${data.inviteCode}
                </div>
                <div style="font-size: 11px; color: #71717a; margin-top: 8px;">
                  Válido por ${expiresIn} dias • Acesso único
                </div>
              </div>

              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${data.inviteUrl}" target="_blank" style="display: inline-block; width: 100%; box-sizing: border-box; padding: 16px 28px; background-color: ${accentColor}; color: #09090b !important; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 14px; text-align: center;">
                      ${isTrainer ? 'Ativar Minha Conta de Treinador' : 'Ativar Meu Acesso FitCoach'} →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 12px; color: #a1a1aa; line-height: 1.5; text-align: center;">
                Ou acesse diretamente pelo link:<br>
                <a href="${data.inviteUrl}" style="color: ${accentLight}; text-decoration: underline; word-break: break-all;">${data.inviteUrl}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px 28px 36px;">
              <div style="padding: 14px 18px; background-color: rgba(255, 255, 255, 0.03); border-radius: 12px; border-left: 3px solid ${accentColor}; font-size: 12px; color: #a1a1aa; line-height: 1.5;">
                <strong style="color: #ffffff;">Segurança & Isolamento de Dados:</strong> Este convite é pessoal e intransferível. Após a ativação, sua conta terá isolamento completo no banco de dados via PostgreSQL RLS.
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 36px; background-color: #111113; border-top: 1px solid #27272a; text-align: center;">
              <p style="font-size: 12px; color: #71717a; margin: 0 0 6px 0;">
                FitCoach Pro • Plataforma Inteligente de Gestão Fitness & Treinadores
              </p>
              <p style="font-size: 11px; color: #52525b; margin: 0;">
                Se você não esperava por este convite, pode desconsiderar esta mensagem com segurança.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
