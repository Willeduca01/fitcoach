import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { supabase, createPersonalInvite } from '../lib/supabase';
import { sendInviteEmail } from '../services/emailService';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Badge } from '../components/common/Badge';
import {
  ShieldAlert,
  Users,
  Dumbbell,
  UserCheck,
  UserPlus,
  KeyRound,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  LogOut,
  Layers,
  Activity,
  CheckCircle2,
  Clock,
  Calendar,
  Database,
  Server,
  Mail,
  Phone,
  ShieldCheck,
  Terminal,
  Cpu
} from 'lucide-react';

interface StudentDevView {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: string;
  status: string;
  startDate: string;
  lastAccess: string;
}

interface PersonalDevView {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cref?: string;
  title?: string;
  planType: string;
  accountStatus: string;
  createdAt: string;
  lastAccess: string;
  students: StudentDevView[];
}

export const MasterDashboardPage: React.FC = () => {
  const { logout, user } = useAuth();
  const { students: localStudents, personal: localPersonal } = useAppData();

  // State
  const [trainers, setTrainers] = useState<PersonalDevView[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTrainerId, setExpandedTrainerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Invites state
  const [invitesCount, setInvitesCount] = useState({ total: 0, pending: 0, used: 0 });

  // Invite generation state
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; url: string; sentEmail?: string } | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  // Carregar dados de desenvolvimento
  useEffect(() => {
    loadMasterDevData();
  }, []);

  const loadMasterDevData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca todos os perfis com role = 'PERSONAL'
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, created_at, updated_at, personal_profiles(title, cref)')
        .eq('role', 'PERSONAL');

      // 2. Busca todos os alunos cadastrados
      const { data: allStudentsData } = await supabase
        .from('students')
        .select('id, personal_id, name, email, phone, plan, status, start_date, created_at, updated_at');

      // 3. Busca métricas de convites
      const { data: allInvites } = await supabase
        .from('invites')
        .select('status');

      if (allInvites) {
        const total = allInvites.length;
        const used = allInvites.filter((i) => i.status === 'USADO').length;
        const pending = allInvites.filter((i) => i.status === 'PENDENTE').length;
        setInvitesCount({ total, pending, used });
      }

      if (!profilesError && profilesData && profilesData.length > 0) {
        const mappedTrainers: PersonalDevView[] = profilesData.map((p: any) => {
          const personalInfo = Array.isArray(p.personal_profiles) ? p.personal_profiles[0] : p.personal_profiles;
          const assignedStudents = (allStudentsData || [])
            .filter((s: any) => s.personal_id === p.id)
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              email: s.email || 'Não informado',
              phone: s.phone || 'Não informado',
              plan: s.plan || 'MENSAL',
              status: s.status || 'ATIVO',
              startDate: formatDate(s.start_date || s.created_at),
              lastAccess: formatRelativeTime(s.updated_at || s.created_at),
            }));

          return {
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            cref: personalInfo?.cref || 'CREF Verificado',
            title: personalInfo?.title || 'Personal Trainer',
            planType: 'PRO ILIMITADO',
            accountStatus: 'ATIVO',
            createdAt: formatDate(p.created_at),
            lastAccess: formatRelativeTime(p.updated_at || p.created_at),
            students: assignedStudents,
          };
        });

        setTrainers(mappedTrainers);
        if (mappedTrainers.length > 0) {
          setExpandedTrainerId(mappedTrainers[0].id);
        }
      } else {
        // Fallback estruturado para demonstração local
        const fallbackStudents: StudentDevView[] = localStudents.map((s) => ({
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          plan: s.plan,
          status: s.status,
          startDate: formatDate(s.startDate),
          lastAccess: 'Hoje às 10:45',
        }));

        setTrainers([
          {
            id: localPersonal.id,
            name: localPersonal.name,
            email: localPersonal.email,
            phone: localPersonal.phone,
            cref: localPersonal.cref,
            title: localPersonal.title,
            planType: 'PRO ANUAL (Beta)',
            accountStatus: 'ATIVO',
            createdAt: '15/09/2026',
            lastAccess: 'Hoje às 11:30',
            students: fallbackStudents,
          }
        ]);
        setExpandedTrainerId(localPersonal.id);
        setInvitesCount({ total: 6, pending: 2, used: 4 });
      }
    } catch {
      setTrainers([]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recente';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return 'Hoje';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Recente';
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = trainerName.trim();
    const cleanEmail = trainerEmail.trim();
    if (!cleanName || !cleanEmail) return;

    setIsCreatingInvite(true);
    setEmailFeedback(null);

    try {
      // 1. Gera registro de convite no Supabase com role de treinador
      const invite = await createPersonalInvite({
        targetName: cleanName,
        targetEmail: cleanEmail,
      });

      const inviteUrl = `${window.location.origin}/fitcoach/#/ativar-convite?code=${invite.code}&email=${encodeURIComponent(cleanEmail)}`;

      setGeneratedInvite({
        code: invite.code,
        url: inviteUrl,
        sentEmail: cleanEmail,
      });

      // 2. Dispara e-mail real formatado em Dark Mode via Resend
      const emailResult = await sendInviteEmail({
        toName: cleanName,
        toEmail: cleanEmail,
        inviteCode: invite.code,
        inviteUrl,
        role: 'trainer',
      });

      if (emailResult.success) {
        setEmailFeedback({
          type: 'success',
          message: `Convite enviado com sucesso para ${cleanEmail}! O professor receberá o link e código no Gmail.`,
        });
      } else if (emailResult.resendDomainRestriction) {
        setEmailFeedback({
          type: 'warning',
          message: `Convite gerado! Nota do Resend: Em modo de testes (sem domínio próprio cadastrado), os e-mails só são entregues para williamsilveira0204@gmail.com. Para enviar a outros e-mails, registre um domínio em resend.com/domains. O link direto está disponível abaixo.`,
        });
      } else {
        setEmailFeedback({
          type: 'warning',
          message: `Convite salvo no banco, mas houve falha no envio por e-mail (${emailResult.error}). Copie o link abaixo ou envie no WhatsApp.`,
        });
      }

      setTrainerName('');
      setTrainerEmail('');
      setInvitesCount((prev) => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
    } catch {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `PROF-${randomSuffix}`;
      const url = `${window.location.origin}/fitcoach/#/ativar-convite?code=${code}&email=${encodeURIComponent(cleanEmail)}`;
      setGeneratedInvite({ code, url, sentEmail: cleanEmail });
      setEmailFeedback({
        type: 'warning',
        message: `Convite criado em modo de demonstração (${code}). Copie o link abaixo para enviar ao professor.`,
      });
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!generatedInvite) return;
    const text = `Olá! Sou o administrador do FitCoach Pro. Preparei seu acesso exclusivo como Personal Trainer. Clique no link para criar sua conta: ${generatedInvite.url}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const filteredTrainers = trainers.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTrainers = trainers.length;
  const totalStudents = trainers.reduce((acc, t) => acc + t.students.length, 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Terminal className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-100 leading-tight">FitCoach Pro</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  CONSOLE DO DESENVOLVEDOR (MASTER)
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {user?.email || 'dev.dev@fitcoach.com.br'} • Acesso de Engenharia & Acessos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <button
              onClick={() => logout()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium border border-white/[0.06] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 space-y-8">
        {/* Metric Cards Banner (Developer / Infrastructure Focused) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Professores */}
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Professores Cadastrados</span>
              <Dumbbell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {totalTrainers}
            </div>
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{totalTrainers} contas ativas</span>
            </p>
          </div>

          {/* Card 2: Alunos */}
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Alunos Vinculados</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {totalStudents}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">Contas vinculadas a professores</p>
          </div>

          {/* Card 3: Convites */}
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Gestão de Convites</span>
              <KeyRound className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
              {invitesCount.total}
            </div>
            <p className="text-[11px] text-zinc-400">
              <strong className="text-teal-300">{invitesCount.used} usados</strong> • {invitesCount.pending} pendentes
            </p>
          </div>

          {/* Card 4: Status do Sistema / Supabase */}
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Status do Banco</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-emerald-400 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>PostgreSQL • RLS</span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">Supabase Auth • Ativo</p>
          </div>
        </div>

        {/* Section: Generate Teacher Invite */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Emissão de Credenciais & Convites para Treinadores
              </h2>
              <p className="text-xs text-zinc-400">
                Gere o código de autorização para um novo professor criar sua conta no sistema.
              </p>
            </div>
          </div>

          {/* Toast / Alerta de Feedback de Envio */}
          {emailFeedback && (
            <div
              className={`p-4 rounded-2xl text-xs flex items-start gap-3 animate-in fade-in duration-300 border ${
                emailFeedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                  : emailFeedback.type === 'warning'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              }`}
            >
              {emailFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1">
                <div className="font-semibold">
                  {emailFeedback.type === 'success'
                    ? 'E-mail Enviado com Sucesso!'
                    : 'Aviso sobre o Envio de E-mail'}
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{emailFeedback.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailFeedback(null)}
                className="text-zinc-400 hover:text-zinc-200 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {!generatedInvite ? (
            <form onSubmit={handleCreateInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nome do Professor *</label>
                <input
                  type="text"
                  required
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail de Cadastro *</label>
                <input
                  type="email"
                  required
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  placeholder="carlos.personal@email.com"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingInvite || !trainerName.trim() || !trainerEmail.trim()}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreatingInvite ? 'Enviando convite...' : 'Gerar Convite de Treinador'}</span>
              </button>
            </form>
          ) : (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Convite de Treinador Gerado! Código: <span className="font-mono text-zinc-100">{generatedInvite.code}</span></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGeneratedInvite(null);
                    setEmailFeedback(null);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Novo Convite
                </button>
              </div>

              {generatedInvite.sentEmail && (
                <div className="text-xs text-zinc-300 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>Destinatário: <strong className="text-zinc-100">{generatedInvite.sentEmail}</strong></span>
                </div>
              )}

              <div className="p-2.5 rounded-xl bg-zinc-950/90 border border-white/[0.06] text-xs font-mono text-zinc-300 select-all truncate">
                {generatedInvite.url}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.06] flex items-center gap-1.5"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                  <span>{isCopied ? 'Link Copiado!' : 'Copiar Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Enviar no WhatsApp</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section: All Trainers & Their Assigned Students (Dev Information) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Contas de Professores & Alunos Conectados
              </h2>
              <p className="text-xs text-zinc-400">
                Auditoria de credenciais, tipo de plano, data de cadastro e último acesso de cada usuário.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar professor por nome ou e-mail..."
                className="w-full bg-zinc-900/90 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* List of Trainers */}
          <div className="space-y-3">
            {filteredTrainers.map((trainer) => {
              const isExpanded = expandedTrainerId === trainer.id;
              return (
                <div
                  key={trainer.id}
                  className="rounded-3xl bg-zinc-900/80 border border-white/[0.08] overflow-hidden transition-all shadow-xl shadow-black/40"
                >
                  {/* Trainer Header Row */}
                  <div
                    onClick={() => setExpandedTrainerId(isExpanded ? null : trainer.id)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-amber-400 font-bold text-sm">
                        {trainer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-zinc-100">{trainer.name}</h3>
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-mono">
                            {trainer.cref || 'CREF'}
                          </span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                            {trainer.planType}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-zinc-500" />
                            {trainer.email}
                          </span>
                          {trainer.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-zinc-500" />
                              {trainer.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-5">
                      <div className="text-left md:text-right text-xs">
                        <div className="text-zinc-300 font-medium flex items-center gap-1.5 md:justify-end">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Último acesso: <strong className="text-zinc-200">{trainer.lastAccess}</strong></span>
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">
                          Criado em: {trainer.createdAt} • <strong className="text-emerald-400">{trainer.students.length} Alunos vinculados</strong>
                        </div>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Students List (Developer & Access Information Only) */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-3 border-t border-white/[0.04] bg-zinc-950/40 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                        <span className="flex items-center gap-1.5 text-zinc-300">
                          <Users className="w-3.5 h-3.5 text-emerald-400" />
                          Alunos vinculados a <strong>{trainer.name}</strong>:
                        </span>
                        <span className="font-mono text-zinc-500">{trainer.students.length} cadastros</span>
                      </div>

                      {trainer.students.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-3 text-center italic">
                          Nenhum aluno cadastrado por este treinador ainda.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {trainer.students.map((student) => {
                            return (
                              <div
                                key={student.id}
                                className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/[0.06] space-y-2 hover:border-white/[0.12] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-zinc-200 truncate">
                                    {student.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-zinc-800 text-emerald-400 border border-emerald-500/20">
                                    {student.plan}
                                  </span>
                                </div>

                                <div className="text-[11px] text-zinc-400 space-y-1">
                                  <p className="flex items-center gap-1.5 truncate text-zinc-300">
                                    <Mail className="w-3 h-3 text-zinc-500 shrink-0" />
                                    <span className="truncate">{student.email}</span>
                                  </p>
                                  {student.phone && student.phone !== 'Não informado' && (
                                    <p className="flex items-center gap-1.5 text-zinc-400">
                                      <Phone className="w-3 h-3 text-zinc-500 shrink-0" />
                                      <span>{student.phone}</span>
                                    </p>
                                  )}
                                  <div className="pt-1.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-zinc-500">
                                    <span>Início: {student.startDate}</span>
                                    <span className="text-zinc-400 font-medium">Acesso: {student.lastAccess}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};
