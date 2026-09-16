import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell,
  ShieldCheck,
  User,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Lock,
  Layers
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAsPersonal, loginAsStudent } = useAuth();
  const { students, personal } = useAppData();
  const navigate = useNavigate();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || 'student-1');

  const handlePersonalLogin = () => {
    loginAsPersonal();
    navigate('/dashboard');
  };

  const handleStudentLogin = () => {
    loginAsStudent(selectedStudentId);
    navigate('/portal-aluno');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
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
            Plataforma All-in-One para Personal Trainers com Portal Integrado do Aluno
          </p>
        </div>

        {/* Access Box */}
        <div className="p-6 sm:p-7 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              Acesso Rápido de Demonstração
            </span>
            <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono border border-white/[0.04]">
              RBAC v2.0
            </span>
          </div>

          {/* Option 1: Personal Trainer (Admin) */}
          <div className="space-y-2">
            <button
              onClick={handlePersonalLogin}
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-950/20 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-zinc-950" />
                </div>
                <div className="text-left">
                  <span className="block leading-tight">Entrar como Personal (Admin)</span>
                  <span className="text-[11px] font-normal text-zinc-900 opacity-90">
                    Dashboard, Finanças, Fichas & CRM
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/[0.06]" />
            <span className="flex-shrink mx-4 text-xs font-medium text-zinc-500 uppercase tracking-widest">
              ou
            </span>
            <div className="flex-grow border-t border-white/[0.06]" />
          </div>

          {/* Option 2: Student Demo */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
                <span>Selecione um Aluno Demo:</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {students.length} cadastrados
                </span>
              </label>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 font-medium transition-colors"
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.paymentStatus === 'EM_DIA' ? 'Em dia' : student.paymentStatus === 'VENCE_EM_BREVE' ? 'Vence em 3d' : 'Atrasado'}) - {student.primaryGoal}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStudentLogin}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.08] text-zinc-100 font-medium text-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-700/50 flex items-center justify-center text-zinc-300">
                  <User className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <span className="block leading-tight">Entrar no Portal do Aluno</span>
                  <span className="text-[11px] font-normal text-zinc-400">
                    Visão Mobile: Treinos, Peso & PIX
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-400">
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/[0.04]">
            <span className="font-semibold text-zinc-200 block">Mobile-First</span>
            <span>Design Linear</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/[0.04]">
            <span className="font-semibold text-zinc-200 block">Copia PIX</span>
            <span>Cobrança em 1 click</span>
          </div>
          <div className="p-2.5 rounded-xl bg-zinc-900/40 border border-white/[0.04]">
            <span className="font-semibold text-zinc-200 block">LocalStorage</span>
            <span>Persistência 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
