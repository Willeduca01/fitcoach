import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Dumbbell,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Loader2,
  KeyRound,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const ResetPasswordPage: React.FC = () => {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const emailHint = searchParams.get('email') || '';

  // Redirecionamento automático após sucesso
  useEffect(() => {
    if (!isSuccess) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isSuccess, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Digite uma nova senha.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As duas senhas digitadas não coincidem.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await updatePassword(password);
      if (!res.success) {
        setErrorMessage(res.error || 'Falha ao redefinir a senha.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro inesperado ao salvar a nova senha.');
      setIsLoading(false);
    }
  };

  const hasMinLength = password.length >= 6;
  const hasMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-xl shadow-emerald-500/20 mb-2">
            <Dumbbell className="w-7 h-7 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">FitCoach</h1>
            <span className="text-xs uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PRO
            </span>
          </div>
          <p className="text-sm text-zinc-400">
            Defina sua nova senha de acesso
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {isSuccess ? (
            <div className="text-center space-y-5 py-3 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-xl font-bold text-white">
                  Senha Alterada com Sucesso!
                </h3>
                <p className="text-xs text-zinc-300 max-w-xs mx-auto">
                  Sua conta já está atualizada com a nova senha cadastrada.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-xs text-zinc-400">
                Redirecionando para o login em <span className="text-emerald-400 font-bold font-mono">{countdown}s</span>...
              </div>

              <Link
                to="/login"
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <span>Fazer Login Agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Cadastrar Nova Senha</span>
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {emailHint ? `Conta: ${emailHint}. ` : ''}Escolha uma combinação segura de no mínimo 6 caracteres.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nova Senha */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Nova Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar Senha */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Requisitos visuais */}
                <div className="space-y-1.5 p-3 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-[11px]">
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className={hasMinLength ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
                      Pelo menos 6 caracteres
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${hasMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className={hasMatch ? 'text-zinc-200 font-medium' : 'text-zinc-500'}>
                      As duas senhas coincidem
                    </span>
                  </div>
                </div>

                {/* Error message */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !hasMinLength || !hasMatch}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Salvando nova senha...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirmar e Salvar Senha</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  <span>Cancelar e voltar ao login</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
