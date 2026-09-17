// Serverless API Handler para Vercel / Netlify / Node
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html } = req.body || {};
  if (!to || !html) {
    return res.status(400).json({ error: 'Campos to e html são obrigatórios' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY não configurada no ambiente do servidor.' });
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FitCoach Pro <onboarding@resend.dev>',
        to: [to],
        subject: subject || 'Convite de Acesso • FitCoach Pro',
        html,
      }),
    });

    const data = await response.json();

    if (response.ok && data.id) {
      return res.status(200).json({ success: true, messageId: data.id });
    }

    return res.status(response.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
