import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, LogOut, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { StudentLayout, StudentTab } from '../components/student/StudentLayout';
import { StudentHomeTab } from '../components/student/StudentHomeTab';
import { WorkoutTrackerTab } from '../components/student/WorkoutTrackerTab';
import { EvolutionTab } from '../components/student/EvolutionTab';
import { PaymentTab } from '../components/student/PaymentTab';
import { ContactTab } from '../components/student/ContactTab';
import { supabase } from '../lib/supabase';

export const StudentPortalPage: React.FC = () => {
  const { role, currentStudentId, user, logout, isPasswordRecovery } = useAuth();
  const { students, isDemoMode, isLoadingData } = useAppData();
  const [currentTab, setCurrentTab] = useState<StudentTab>('home');
  const [isLinking, setIsLinking] = useState(false);
  const navigate = useNavigate();

  // Se o usuário estiver em fluxo de redefinição de senha, redireciona imediatamente para a tela correta
  if (isPasswordRecovery || (typeof window !== 'undefined' && sessionStorage.getItem('fitcoach_password_recovery') === 'true')) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Professores reais não acessam a visão de aluno
  if (role === 'PERSONAL' && !isDemoMode) {
    return <Navigate to="/" replace />;
  }

  const activeStudent = students.find((s) => s.id === currentStudentId) || (isDemoMode ? students[0] : undefined);

  // Tentativa automática de vincular a conta do aluno ao carregar se não houver aluno ativo
  useEffect(() => {
    let isCancelled = false;
    if (!activeStudent && user?.id && user?.email && !isLoadingData) {
      setIsLinking(true);
      (async () => {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          let res = await fetch('/api/link-student', {
            method: 'POST',
            headers,
            body: JSON.stringify({ userId: user.id, email: user.email }),
          }).catch(() => null);

          if (!res || res.status === 404) {
            res = await fetch('/fitcoach/api/link-student', {
              method: 'POST',
              headers,
              body: JSON.stringify({ userId: user.id, email: user.email }),
            }).catch(() => null);
          }

          if (res && res.ok) {
            const data = await res.json();
            if (!isCancelled && data?.success) {
              window.location.reload();
            }
          }
        } catch (err) {
          console.warn('[StudentPortalPage] Auto-link falhou:', err);
        } finally {
          if (!isCancelled) setIsLinking(false);
        }
      })();
    }
    return () => {
      isCancelled = true;
    };
  }, [activeStudent, user?.id, user?.email, isLoadingData]);

  if (isLoadingData || isLinking) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="space-y-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Carregando seus treinos e ficha de aluno...</p>
        </div>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 rounded-[28px] bg-[#121c1a]/75 backdrop-blur-2xl border border-white/[0.09] ring-1 ring-white/[0.05] shadow-[0_25px_60px_rgba(0,0,0,0.7)] space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">Ficha de Aluno Não Encontrada</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Você está conectado, mas não localizamos dados de aluno para esta conta. Se você estava redefinindo sua senha ou é um Personal Trainer, escolha uma das opções abaixo:
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              to="/redefinir-senha"
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <KeyRound className="w-4 h-4" />
              <span>Redefinir / Criar Minha Senha</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/dashboard"
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Acessar Painel do Personal</span>
            </Link>

            <button
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              className="w-full py-3 rounded-xl bg-transparent hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 font-medium text-xs transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta e Voltar ao Login</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'home' && (
        <StudentHomeTab student={activeStudent} onNavigateTab={setCurrentTab} />
      )}
      {currentTab === 'workout' && <WorkoutTrackerTab student={activeStudent} />}
      {currentTab === 'evolution' && <EvolutionTab student={activeStudent} />}
      {currentTab === 'payment' && <PaymentTab student={activeStudent} />}
      {currentTab === 'contact' && <ContactTab student={activeStudent} />}
    </StudentLayout>
  );
};
