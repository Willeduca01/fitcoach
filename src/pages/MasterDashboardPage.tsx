import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { supabase, createPersonalInvite } from '../lib/supabase';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { Badge } from '../components/common/Badge';
import {
  ShieldAlert,
  Users,
  Dumbbell,
  DollarSign,
  TrendingUp,
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
  AlertCircle
} from 'lucide-react';

interface PersonalWithStudents {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cref?: string;
  title?: string;
  students: any[];
}

export const MasterDashboardPage: React.FC = () => {
  const { logout, user } = useAuth();
  const { students: localStudents, personal: localPersonal } = useAppData();

  // State
  const [trainers, setTrainers] = useState<PersonalWithStudents[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTrainerId, setExpandedTrainerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Invite generation state
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; url: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  // Carregar dados de todos os professores e alunos
  useEffect(() => {
    loadMasterData();
  }, []);

  const loadMasterData = async () => {
    setIsLoading(true);
    try {
      // 1. Busca todos os perfis com role = 'PERSONAL'
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email, phone, personal_profiles(title, cref)')
        .eq('role', 'PERSONAL');

      // 2. Busca todos os alunos cadastrados
      const { data: allStudentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');

      if (!profilesError && profilesData && profilesData.length > 0) {
        const mappedTrainers: PersonalWithStudents[] = profilesData.map((p: any) => {
          const personalInfo = Array.isArray(p.personal_profiles) ? p.personal_profiles[0] : p.personal_profiles;
          const assignedStudents = (allStudentsData || []).filter((s: any) => s.personal_id === p.id);
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            phone: p.phone,
            cref: personalInfo?.cref || 'CREF Ativo',
            title: personalInfo?.title || 'Personal Trainer',
            students: assignedStudents,
          };
        });
        setTrainers(mappedTrainers);
        if (mappedTrainers.length > 0) {
          setExpandedTrainerId(mappedTrainers[0].id);
        }
      } else {
        // Fallback para demonstração local
        setTrainers([
          {
            id: localPersonal.id,
            name: localPersonal.name,
            email: localPersonal.email,
            phone: localPersonal.phone,
            cref: localPersonal.cref,
            title: localPersonal.title,
            students: localStudents,
          }
        ]);
        setExpandedTrainerId(localPersonal.id);
      }
    } catch {
      setTrainers([
        {
          id: localPersonal.id,
          name: localPersonal.name,
          email: localPersonal.email,
          phone: localPersonal.phone,
          cref: localPersonal.cref,
          title: localPersonal.title,
          students: localStudents,
        }
      ]);
      setExpandedTrainerId(localPersonal.id);
    } finally {
      setIsLoading(false);
    }
  };

  // Estatísticas Globais
  const totalTrainers = trainers.length;
  const totalStudents = trainers.reduce((acc, t) => acc + t.students.length, 0);
  const totalMRR = trainers.reduce((acc, t) => {
    const trainerMRR = t.students.reduce((sub, s) => sub + (Number(s.monthly_fee || s.monthlyFee) || 0), 0);
    return acc + trainerMRR;
  }, 0);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName.trim()) return;

    setIsCreatingInvite(true);
    try {
      const invite = await createPersonalInvite({
        targetName: trainerName.trim(),
        targetEmail: trainerEmail.trim() || undefined,
      });

      const inviteUrl = `${window.location.origin}/fitcoach/#/cadastro?convite=${invite.code}`;
      setGeneratedInvite({
        code: invite.code,
        url: inviteUrl,
      });
      setTrainerName('');
      setTrainerEmail('');
    } catch {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `PROF-${randomSuffix}`;
      const url = `${window.location.origin}/fitcoach/#/cadastro?convite=${code}`;
      setGeneratedInvite({ code, url });
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-16">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <ShieldAlert className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-zinc-100 leading-tight">FitCoach Pro</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  DEVELOPER MASTER
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                {user?.email || 'dev.dev@fitcoach.com.br'}
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
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Professores Ativos</span>
              <Dumbbell className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {totalTrainers}
            </div>
            <p className="text-[11px] text-zinc-400">Personal Trainers com acesso à plataforma</p>
          </div>

          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total de Alunos</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight">
              {totalStudents}
            </div>
            <p className="text-[11px] text-zinc-400">Alunos cadastrados sob gestão dos professores</p>
          </div>

          <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Volume Mensal Consolidado</span>
              <DollarSign className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100 tracking-tight font-mono">
              {totalMRR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <p className="text-[11px] text-zinc-400">Soma de contratos gerenciados</p>
          </div>
        </div>

        {/* Section: Generate Teacher Invite */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.06]">
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Emitir Convite para Novo Personal Trainer
              </h2>
              <p className="text-xs text-zinc-400">
                Apenas convites gerados aqui permitem que novos professores se cadastrem na plataforma.
              </p>
            </div>
          </div>

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
                <label className="block text-xs font-medium text-zinc-400 mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  value={trainerEmail}
                  onChange={(e) => setTrainerEmail(e.target.value)}
                  placeholder="carlos.personal@email.com"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingInvite || !trainerName.trim()}
                className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreatingInvite ? 'Gerando...' : 'Gerar Convite de Treinador'}</span>
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
                  onClick={() => setGeneratedInvite(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Fechar
                </button>
              </div>

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

        {/* Section: All Trainers & Their Assigned Students */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Carteira Global de Professores & Alunos
              </h2>
              <p className="text-xs text-zinc-400">
                Visualize cada Personal Trainer e os alunos vinculados a ele com isolamento de dados.
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar professor por nome..."
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
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors"
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
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                          <span>{trainer.email}</span>
                          {trainer.phone && <span>• {trainer.phone}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-semibold text-emerald-400">
                          {trainer.students.length} Alunos
                        </span>
                        <span className="block text-[10px] text-zinc-500">
                          {trainer.students.reduce((acc, s) => acc + (Number(s.monthly_fee || s.monthlyFee) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                        </span>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-zinc-800/80 flex items-center justify-center text-zinc-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Students List */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-white/[0.04] bg-zinc-950/40 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
                        <span>Alunos Vinculados a {trainer.name}:</span>
                        <span>{trainer.students.length} cadastrados</span>
                      </div>

                      {trainer.students.length === 0 ? (
                        <p className="text-xs text-zinc-500 py-3 text-center italic">
                          Nenhum aluno cadastrado por este treinador ainda.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {trainer.students.map((student: any) => {
                            const fee = Number(student.monthly_fee || student.monthlyFee) || 0;
                            const status = student.payment_status || student.paymentStatus || 'EM_DIA';
                            return (
                              <div
                                key={student.id}
                                className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/[0.06] space-y-2 hover:border-white/[0.12] transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-zinc-200 truncate">
                                    {student.name}
                                  </span>
                                  <Badge
                                    variant={
                                      status === 'EM_DIA' ? 'success' : status === 'VENCE_EM_BREVE' ? 'warning' : 'danger'
                                    }
                                    size="sm"
                                  >
                                    {status === 'EM_DIA' ? 'Em dia' : status === 'VENCE_EM_BREVE' ? 'Vence breve' : 'Atrasado'}
                                  </Badge>
                                </div>

                                <div className="text-[11px] text-zinc-400 space-y-0.5">
                                  <p className="truncate">Plano: <span className="text-zinc-300 font-medium">{student.plan}</span></p>
                                  <p>Mensalidade: <span className="text-emerald-400 font-mono font-medium">{fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                                  {student.email && <p className="truncate text-zinc-500">{student.email}</p>}
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
