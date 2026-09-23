import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, User, RotateCcw, ChevronUp, ChevronDown, Sparkles } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { sanitizeUrl } from '../../lib/security';

export const QuickSwitcher: React.FC = () => {
  const { role, currentStudentId, switchRole } = useAuth();
  const { students, resetToDemoData, isDemoMode } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  // Ocultar completamente o alternador de perfis para contas reais.
  // Este recurso de alternar para a visão do aluno é exclusivo da conta demonstrativa comercial (Teste@fitcoach).
  if (
    !isDemoMode ||
    !role ||
    location.pathname === '/login' ||
    location.pathname === '/cadastro' ||
    location.pathname === '/register'
  ) {
    return null;
  }

  const activeStudent = students.find((s) => s.id === currentStudentId) || students[0];

  const handleSelectPersonal = () => {
    switchRole('PERSONAL');
    setIsExpanded(false);
    navigate('/dashboard');
  };

  const handleSelectStudent = (studentId: string) => {
    switchRole('STUDENT', studentId);
    setIsExpanded(false);
    navigate('/portal-aluno');
  };

  const handleReset = () => {
    resetToDemoData();
    setShowConfirmReset(false);
    window.location.reload();
  };
  return (
    <>
      {/* Backdrop para fechar o menu ao clicar fora no mobile */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className="fixed bottom-16 right-3 sm:bottom-4 sm:right-4 z-50 flex flex-col items-end font-sans">
        {/* Expanded Menu */}
        {isExpanded && (
          <div className="mb-2 w-80 sm:w-96 rounded-2xl bg-zinc-900/95 border border-white/[0.1] shadow-2xl shadow-black/60 backdrop-blur-xl p-4 text-zinc-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
                  Alternador de Perfis (RBAC)
                </span>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1 rounded-md"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Current Status Pill */}
            <div className="my-3 px-3 py-2 rounded-xl bg-zinc-800/50 border border-white/[0.06] text-xs flex items-center justify-between">
              <span className="text-zinc-400">Perfil Ativo:</span>
              <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
                {role === 'PERSONAL' ? (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    Personal Trainer (Admin)
                  </>
                ) : (
                  <>
                    <User className="w-3.5 h-3.5 text-zinc-300" />
                    Aluno: {activeStudent?.name}
                  </>
                )}
              </span>
            </div>

            {/* Quick Buttons */}
            <div className="space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                Alternar Ambiente
              </p>

              {/* Personal Button */}
              <button
                onClick={handleSelectPersonal}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  role === 'PERSONAL' && location.pathname.startsWith('/dashboard')
                    ? 'bg-zinc-800 text-zinc-100 border-white/[0.12] shadow-subtle'
                    : 'bg-zinc-900/60 border-white/[0.04] text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                  <span>Painel do Personal (Admin)</span>
                </div>
                {role === 'PERSONAL' && <span className="text-[10px] bg-white/[0.06] px-2 py-0.5 rounded text-zinc-300">Ativo</span>}
              </button>

              {/* Student Dropdown / Selector */}
              <div className="pt-1">
                <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 block mb-1.5">
                  Simular como Aluno
                </label>
                <div className="space-y-1 max-h-44 overflow-y-auto pr-1">
                  {students.map((student) => {
                    const isCurrent = role === 'STUDENT' && currentStudentId === student.id;
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleSelectStudent(student.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all ${
                          isCurrent
                            ? 'bg-zinc-800 text-zinc-100 border-white/[0.12] font-semibold'
                            : 'bg-zinc-900/40 border-white/[0.04] text-zinc-400 hover:bg-zinc-850 hover:text-zinc-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <img
                            src={sanitizeUrl(student.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100')}
                            alt={student.name}
                            className="w-5 h-5 rounded-full object-cover ring-1 ring-white/10"
                          />
                          <span className="truncate">{student.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              student.paymentStatus === 'EM_DIA'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : student.paymentStatus === 'VENCE_EM_BREVE'
                                ? 'bg-amber-500/10 text-amber-300'
                                : 'bg-rose-500/10 text-rose-300'
                            }`}
                          >
                            {student.paymentStatus === 'EM_DIA' ? 'Em dia' : student.paymentStatus === 'VENCE_EM_BREVE' ? '3 dias' : 'Atrasado'}
                          </span>
                          {isCurrent && <span className="text-[10px] text-emerald-400 font-bold">•</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Reset Demo Data Button & Theme Toggle */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs">
              {showConfirmReset ? (
                <div className="flex items-center justify-between w-full gap-2">
                  <span className="text-[11px] text-rose-300">Confirmar reset?</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleReset}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-[11px]"
                    >
                      Sim
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => setShowConfirmReset(true)}
                    className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restaurar dados demo</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <span className="text-[11px] text-zinc-500">Tema:</span>
                    <ThemeToggle size="sm" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Trigger: Apenas a Seta para alternar modo demo discretamente */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          title="Alternar perfil de teste (Demo)"
          aria-label="Alternar perfil de teste (Demo)"
          className="w-10 h-10 rounded-full flex items-center justify-center bg-zinc-900/95 hover:bg-zinc-800 border border-white/[0.12] hover:border-emerald-500/50 shadow-xl shadow-black/50 backdrop-blur-xl text-zinc-300 hover:text-emerald-400 transition-all duration-200 active:scale-90 group relative"
        >
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950" />
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-emerald-400 transition-transform duration-200" />
          ) : (
            <ChevronUp className="w-5 h-5 text-zinc-300 group-hover:text-emerald-400 transition-transform duration-200" />
          )}
        </button>
      </div>
    </>
  );
};
