/**
 * FITCOACH PRO — MÓDULO DE TELEMETRIA, LOGS E DIAGNÓSTICO DO SISTEMA (DEV CONSOLE)
 * Rastreia eventos de segurança, falhas de autenticação, despachos de e-mail e erros de runtime,
 * associando cada ocorrência a uma explicação contextual e diagnóstico do provável problema.
 */

export type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
export type LogCategory = 'SECURITY' | 'AUTH' | 'EMAIL' | 'DATABASE' | 'RUNTIME' | 'NETWORK';

export interface SystemLogEntry {
  id: string;
  timestamp: number;
  severity: LogSeverity;
  category: LogCategory;
  event: string;
  message: string;
  identifier?: string;
  ip?: string;
  probableCause?: string;
  recommendedAction?: string;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = 'fitcoach_dev_system_logs';
const MAX_LOGS = 250;

// Base de Conhecimento de Diagnóstico & Resolução para o Desenvolvedor
export const DIAGNOSTIC_KNOWLEDGE_BASE: Record<
  string,
  { cause: string; action: string }
> = {
  RATE_LIMIT_LOCKOUT: {
    cause:
      'Múltiplas tentativas incorretas consecutivas (5+) excederam a janela de tolerância de 5 minutos na chave de IP ou de Conta.',
    action:
      'Se for um teste ou usuário legítimo, use o botão "Resetar Rate Limit" no painel de DEV. Em ambiente de produção, este bloqueio protege ativamente contra força bruta.',
  },
  RATE_LIMIT_WARNING: {
    cause:
      'A conta ou IP acumula falhas recentes e está próximo do bloqueio temporário (restam 1 ou 2 tentativas).',
    action:
      'Confirme se o usuário lembra a senha correta ou oriente o uso do fluxo "Esqueceu a senha?" antes do travamento.',
  },
  CAPTCHA_CHALLENGE_ACTIVE: {
    cause:
      'O modo adaptativo de defesa anti-bot ativou o Cloudflare Turnstile após detecção de 2 tentativas consecutivas sem sucesso.',
    action:
      'Comportamento padrão de segurança: nenhuma ação corretiva necessária. Usuários legítimos passam pelo Turnstile em 1 clique.',
  },
  CAPTCHA_VERIFICATION_FAILED: {
    cause:
      'A API da Cloudflare rejeitou o token fornecido ou o token expirou (tempo limite de 300s excedido).',
    action:
      'Verifique se o relógio do sistema está correto ou se há bloqueadores de script de terceiros no navegador do cliente.',
  },
  RESEND_DOMAIN_RESTRICTION: {
    cause:
      'A conta do Resend está em modo de testes gratuitos (sandbox), permitindo envio somente para o e-mail verificado da conta.',
    action:
      'Cadastre um domínio próprio verificado no painel do Resend (resend.com/domains) ou configure as credenciais GMAIL_USER e GMAIL_APP_PASSWORD no arquivo .env para envio SMTP direto.',
  },
  EMAIL_SEND_FAILED: {
    cause:
      'Falha de autenticação SMTP, rejeição de destinatário ou falha de conectividade com o provedor de e-mail.',
    action:
      'Verifique se as variáveis GMAIL_USER / GMAIL_APP_PASSWORD ou RESEND_API_KEY estão válidas no servidor local ou na Vercel.',
  },
  EMAIL_SERVER_ERROR: {
    cause:
      'O endpoint serverless (/api/send-invite) retornou erro HTTP 500 ou resposta não-JSON (crash de runtime na Vercel).',
    action:
      'Local de origem: api/send-invite.ts. Verifique se GMAIL_USER e GMAIL_APP_PASSWORD estão adicionadas na Vercel e se o Redeploy mais recente foi concluído.',
  },
  GMAIL_SMTP_AUTH_ERROR: {
    cause:
      'O Google rejeitou o login SMTP (código 535-5.7.8). O usuário ou senha de aplicativo (16 letras) está incorreto ou a autenticação de 2 fatores foi revogada.',
    action:
      'Acesse myaccount.google.com/apppasswords, gere uma nova senha de aplicativo de 16 letras para o FitCoach e atualize a variável GMAIL_APP_PASSWORD na Vercel sem espaços.',
  },
  UNAUTHORIZED_ROUTE_ACCESS: {
    cause:
      'Um visitante ou usuário não autenticado tentou acessar diretamente a URL administrativa /master na barra de navegação.',
    action:
      'Defesa ativa RBAC: O RouteGuard interceptou o acesso e redirecionou para /login, impedindo vazamento de dados de desenvolvedor.',
  },
  UNAUTHORIZED_ROLE_ACCESS: {
    cause:
      'Um usuário logado tentou acessar um portal que exige um papel hierárquico superior (ex: aluno ou personal tentando acessar /master).',
    action:
      'O RouteGuard bloqueou o acesso e redirecionou o usuário para o seu portal correspondente.',
  },
  AUTH_INVALID_CREDENTIALS: {
    cause:
      'O e-mail ou a senha informados não coincidem com nenhum usuário registrado na tabela auth.users do Supabase.',
    action:
      'Verifique se a conta já foi confirmada ou se o usuário foi cadastrado via convite de professor ou aluno.',
  },
  RUNTIME_RENDER_CRASH: {
    cause:
      'Uma exceção não tratada ocorreu durante a renderização de um componente React (capturada pelo ErrorBoundary).',
    action:
      'Inspecione os metadados do log e o nome do componente afetado para corrigir a referência nula ou tipagem.',
  },
  NETWORK_OFFLINE: {
    cause:
      'O navegador perdeu conexão com a internet ou os servidores do Supabase / Cloudflare estão temporariamente inacessíveis.',
    action:
      'Verifique a conexão de rede local e o status dos serviços do Supabase (status.supabase.com).',
  },
  DATABASE_RLS_VIOLATION: {
    cause:
      'Uma consulta tentou acessar ou modificar uma linha restrita pelas políticas de Row Level Security (RLS).',
    action:
      'Confirme se o usuário autenticado possui o papel (role) correto (MASTER, PERSONAL ou STUDENT) exigido pela política.',
  },
};

function getStoredLogs(): SystemLogEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedInitialLogs();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLogs(logs: SystemLogEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent('fitcoach_system_log_updated'));
  } catch (err) {
    console.warn('[SystemLogger] Erro ao persistir logs:', err);
  }
}

// Inicializa com registros didáticos de demonstração se o storage estiver vazio
function seedInitialLogs(): SystemLogEntry[] {
  const now = Date.now();
  const sampleLogs: SystemLogEntry[] = [
    {
      id: 'log_seed_1',
      timestamp: now - 35000,
      severity: 'INFO',
      category: 'SECURITY',
      event: 'SECURITY_MODULE_INITIALIZED',
      message: 'Módulos OWASP XSS e Rate Limiting Composto (IP + Conta) inicializados com sucesso.',
      probableCause: 'Inicialização normal da aplicação com políticas de cabeçalhos CSP ativas.',
      recommendedAction: 'Nenhuma ação necessária. Todas as proteções ativas.',
    },
    {
      id: 'log_seed_2',
      timestamp: now - 28000,
      severity: 'INFO',
      category: 'SECURITY',
      event: 'TURNSTILE_CAPTCHA_READY',
      message: 'Cloudflare Turnstile configurado e disponível com chave de teste 1x00000000000000000000AA.',
      probableCause: 'Script carregado em Web Worker com renderização sob demanda.',
      recommendedAction: 'Para ambiente de produção, configure a chave de site própria no painel da Cloudflare.',
    },
    {
      id: 'log_seed_3',
      timestamp: now - 18000,
      severity: 'INFO',
      category: 'DATABASE',
      event: 'SUPABASE_CONNECTED',
      message: 'Conexão estabelecida com sucesso com PostgreSQL e Supabase Auth.',
      metadata: { endpoint: 'https://xmpbzpdggsonzftueynw.supabase.co' },
      probableCause: 'Credenciais de API do Supabase verificadas e autenticadas.',
      recommendedAction: 'Políticas RLS ativas em profiles, invites, students e workouts.',
    },
    {
      id: 'log_seed_4',
      timestamp: now - 10000,
      severity: 'INFO',
      category: 'AUTH',
      event: 'DEV_MASTER_SESSION_ACTIVE',
      message: 'Sessão do Desenvolvedor Master autenticada no console de engenharia.',
      identifier: 'dev.dev@fitcoach.com.br',
      probableCause: 'Login de administrador de sistema validado com role MASTER.',
      recommendedAction: 'Acesso total a telemetria, criação de convites de professores e auditoria.',
    },
  ];

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleLogs));
  } catch {}
  return sampleLogs;
}

export const systemLogger = {
  getLogs(): SystemLogEntry[] {
    return getStoredLogs();
  },

  log(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>): SystemLogEntry {
    const logs = getStoredLogs();
    const knowledge = DIAGNOSTIC_KNOWLEDGE_BASE[entry.event];

    const newLog: SystemLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      probableCause: entry.probableCause || knowledge?.cause,
      recommendedAction: entry.recommendedAction || knowledge?.action,
      ...entry,
    };

    logs.unshift(newLog);
    saveLogs(logs);
    return newLog;
  },

  info(category: LogCategory, event: string, message: string, metadata?: Record<string, any>) {
    return this.log({ severity: 'INFO', category, event, message, metadata });
  },

  warn(category: LogCategory, event: string, message: string, metadata?: Record<string, any>) {
    return this.log({ severity: 'WARN', category, event, message, metadata });
  },

  error(category: LogCategory, event: string, message: string, metadata?: Record<string, any>) {
    return this.log({ severity: 'ERROR', category, event, message, metadata });
  },

  critical(category: LogCategory, event: string, message: string, metadata?: Record<string, any>) {
    return this.log({ severity: 'CRITICAL', category, event, message, metadata });
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      saveLogs([]);
    }
  },

  subscribe(callback: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('fitcoach_system_log_updated', callback);
    window.addEventListener('storage', callback);
    return () => {
      window.removeEventListener('fitcoach_system_log_updated', callback);
      window.removeEventListener('storage', callback);
    };
  },

  exportAsJson(): string {
    return JSON.stringify(getStoredLogs(), null, 2);
  },
};

// Captura automática de exceções de runtime não tratadas no navegador
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignora erros de extensões de navegador
    if (event.filename && !event.filename.includes(window.location.host)) return;
    systemLogger.error(
      'RUNTIME',
      'RUNTIME_UNHANDLED_EXCEPTION',
      event.message || 'Exceção não tratada capturada no navegador.',
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = typeof reason === 'object' ? reason?.message || JSON.stringify(reason) : String(reason);
    systemLogger.warn(
      'RUNTIME',
      'UNHANDLED_PROMISE_REJECTION',
      `Promessa rejeitada sem tratamento: ${msg.slice(0, 150)}`,
      { reason: msg }
    );
  });
}
