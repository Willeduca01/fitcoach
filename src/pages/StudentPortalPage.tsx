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
    return <Navigate to="/dashboard" replace />;
  }

  const activeStudent = students.find((s) => s.id === currentStudentId) || students[0];

  // Tentativa automática de vincular a conta do aluno ao carregar se não houver aluno ativo
  useEffect(() => {
    let isCancelled = false;
    if (!activeStudent && user?.id && user?.email && !isLoadingData) {
      setIsLinking(true);
      fetch('/api/link-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      })
        .then((res) => {
          if (!res || res.status === 404) {
            return fetch('/fitcoach/api/link-student', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.id, email: user.email }),
            });
          }
          return res;
        })
        .then((res) => res?.json())
        .then((data) => {
          if (!isCancelled && data?.success) {
            window.location.reload();
          }
        })
        .catch((err) => {
          console.warn('[StudentPortalPage] Auto-link falhou:', err);
        })
        .finally(() => {
          if (!isCancelled) setIsLinking(false);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [activeStudent, user?.id, user?.email, isLoadingData]);

  if (isLoadingData || isLinking) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="space-y-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Carregando seus treinos e ficha de aluno...</p>
        </div>
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="max-w-md w-full p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl space-y-6">
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
