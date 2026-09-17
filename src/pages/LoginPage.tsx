import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate, Link } from 'react-router-dom';
import { MasterInviteModal } from '../components/common/MasterInviteModal';
import {
  Dumbbell,
  ShieldCheck,
  User,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
  Mail,
  KeyRound,
  Layers,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Cpu
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAsPersonal, loginAsStudent, loginWithPassword, role } = useAuth();
  const { students } = useAppData();
  const navigate = useNavigate();

  // Real Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // UI States
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'student-1');
  const [showDemoAccess, setShowDemoAccess] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setIsLoading(true);
    setErrorMessage('');

    try {
      const result = await loginWithPassword(email, password);
      if (!result.success) {
        setErrorMessage(result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsLoading(false);
        return;
      }

      // Redireciona com base no papel detectado
      const targetRole = result.role || role;
      if (targetRole === 'MASTER') {
        navigate('/master');
      } else if (targetRole === 'STUDENT') {
        navigate('/portal-aluno');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao realizar login.');
      setIsLoading(false);
    }
  };

  const handlePersonalDemoLogin = () => {
    loginAsPersonal();
    navigate('/dashboard');
  };

  const handleStudentDemoLogin = () => {
    loginAsStudent(selectedStudentId);
    navigate('/portal-aluno');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-zinc-700/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Logo & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 mx-auto">
            <Dumbbell className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">FitCoach</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              PRO
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Plataforma All-in-One para Personal Trainers e Portal Integrado do Aluno
          </p>
        </div>

        {/* Access Box */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 space-y-5">
          {/* Official Real Login Form */}
          <form onSubmit={handleRealLogin} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Acesse sua Conta
              </span>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
                Supabase Auth
              </span>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1">E-mail de Acesso</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-zinc-400">Senha</label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha segura"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Link to Register via Invite */}
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.06] text-center space-y-1">
            <p className="text-xs text-zinc-400">
              Recebeu um convite de professor ou do treinador?
            </p>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Ativar meu acesso com Código de Convite</span>
            </Link>
          </div>

          {/* Collapsible Demo Access */}
          <div className="pt-2 border-t border-white/[0.06] space-y-3">
            <button
              type="button"
              onClick={() => setShowDemoAccess(!showDemoAccess)}
              className="w-full flex items-center justify-between text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                Acesso Rápido de Teste (1 Clique)
              </span>
              {showDemoAccess ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDemoAccess && (
              <div className="space-y-3 pt-2 animate-in fade-in duration-200">
                {/* Personal Demo */}
                <button
                  type="button"
                  onClick={handlePersonalDemoLogin}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/[0.06] text-zinc-200 text-xs font-medium transition-all group"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Entrar como Personal (Demo)</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Student Demo */}
                <div className="space-y-2">
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.paymentStatus === 'EM_DIA' ? 'Em dia' : 'Pendente'})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleStudentDemoLogin}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-white/[0.06] text-zinc-200 text-xs font-medium transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-4 h-4 text-teal-400" />
                      <span>Entrar como Aluno Selecionado</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Developer Master Button (Only for owner/dev) */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => setIsMasterModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800 text-[11px] font-mono text-zinc-400 hover:text-amber-400 border border-white/[0.04] transition-colors"
          >
            <Cpu className="w-3 h-3 text-amber-400" />
            <span>Painel do Desenvolvedor: Convidar Treinador</span>
          </button>
        </div>
      </div>

      {/* Master Developer Modal */}
      <MasterInviteModal
        isOpen={isMasterModalOpen}
        onClose={() => setIsMasterModalOpen(false)}
      />
    </div>
  );
};
