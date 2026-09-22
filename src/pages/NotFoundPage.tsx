import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Home, ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react';

export interface NotFoundPageProps {
  errorCode?: string;
  title?: string;
  description?: string;
  isErrorBoundary?: boolean;
  onReset?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  errorCode = '404',
  title = 'Página não encontrada',
  description = 'O endereço que você tentou acessar não existe, foi removido ou está temporariamente indisponível.',
  isErrorBoundary = false,
  onReset,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuth();

  const handleGoHome = () => {
    if (onReset) {
      onReset();
    }
    if (!isAuthenticated) {
      navigate('/login');
    } else if (role === 'MASTER') {
      navigate('/master');
    } else if (role === 'STUDENT') {
      navigate('/portal-aluno');
    } else {
      navigate('/dashboard');
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      handleGoHome();
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans select-none">
      <div className="w-full max-w-md relative z-10 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
        {/* Logo & Brand Header */}
        <div className="space-y-2.5">
          <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#2dd4bf] to-[#059669] shadow-[0_0_35px_rgba(45,212,191,0.28)] mx-auto flex items-center justify-center p-0.5">
            <div className="w-full h-full rounded-[20px] bg-gradient-to-tr from-[#2dd4bf] via-[#10b981] to-[#059669] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-[#071915] stroke-[2.4]" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-[26px] font-bold tracking-tight text-white">FitCoach</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </div>
        </div>

        {/* Card Principal */}
        <div className="p-8 sm:p-10 rounded-[28px] bg-[#121c1a]/70 backdrop-blur-2xl border border-white/[0.09] ring-1 ring-white/[0.05] shadow-[0_25px_60px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          {/* Badge de Erro Simples */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Erro {errorCode}</span>
          </div>

          {/* Número do Erro Estilizado */}
          <div className="space-y-2">
            <h1 className="text-7xl sm:text-8xl font-black tracking-tight bg-gradient-to-b from-zinc-100 via-zinc-300 to-zinc-600 bg-clip-text text-transparent">
              {errorCode}
            </h1>
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto leading-relaxed">
              {description}
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="space-y-3 pt-2">
            {isErrorBoundary ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
              >
                <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
                <span>Recarregar Página</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleGoHome}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
              >
                <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Voltar ao Início</span>
              </button>
            )}

            {!isErrorBoundary && (
              <button
                type="button"
                onClick={handleGoBack}
                className="w-full py-3 rounded-2xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-white/[0.08] text-zinc-300 hover:text-zinc-100 font-medium text-xs transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar à página anterior</span>
              </button>
            )}
          </div>
        </div>

        {/* Rodapé de Segurança Discreto */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Ambiente Seguro • FitCoach Pro</span>
        </div>
      </div>
    </div>
  );
};
