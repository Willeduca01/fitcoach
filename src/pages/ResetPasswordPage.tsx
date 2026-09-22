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
  ShieldAlert,
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
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const emailHint = searchParams.get('email') || '';

  // Verificação e estabelecimento de sessão de recuperação
  useEffect(() => {
    let isMounted = true;

    const initRecoverySession = async () => {
      setIsVerifyingSession(true);

      // 1. Verifica se já existe sessão ativa
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (isMounted) {
          setHasValidSession(true);
          setIsVerifyingSession(false);
        }
        return;
      }

      // 2. Extrai tokens da URL (suporta hash e search parameters)
      const fullHash = window.location.hash || '';
      const fullSearch = window.location.search || '';

      // Verifica PKCE code (?code=...)
      let code = searchParams.get('code');
      if (!code && fullHash.includes('code=')) {
        const hashQuery = fullHash.split('?')[1] || '';
        const hashParams = new URLSearchParams(hashQuery);
        code = hashParams.get('code');
      }

      if (code) {
        try {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data.session) {
            if (isMounted) {
              setHasValidSession(true);
              setIsVerifyingSession(false);
            }
            return;
          }
        } catch (e) {
          console.warn('[ResetPassword] Erro ao trocar code:', e);
        }
      }

      // Verifica access_token e refresh_token no hash
      if (fullHash.includes('access_token=')) {
        const hashParts = fullHash.split('#');
        for (const part of hashParts) {
          if (part.includes('access_token=')) {
            const tokenParams = new URLSearchParams(part);
            const accessToken = tokenParams.get('access_token');
            const refreshToken = tokenParams.get('refresh_token');
            if (accessToken && refreshToken) {
              try {
                const { data, error } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });
                if (!error && data.session) {
                  if (isMounted) {
                    setHasValidSession(true);
                    setIsVerifyingSession(false);
                  }
                  return;
                }
              } catch (e) {
                console.warn('[ResetPassword] Erro ao setar sessão via hash:', e);
              }
            }
          }
        }
      }

      // 3. Verifica token_hash (fluxo de verifyOtp)
      let tokenHash = searchParams.get('token_hash');
      if (!tokenHash && fullHash.includes('token_hash=')) {
        const hashQuery = fullHash.split('?')[1] || '';
        const hashParams = new URLSearchParams(hashQuery);
        tokenHash = hashParams.get('token_hash');
      }

      if (tokenHash) {
        try {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });
          if (!error && data.session) {
            if (isMounted) {
              setHasValidSession(true);
              setIsVerifyingSession(false);
            }
            return;
          }
        } catch (e) {
          console.warn('[ResetPassword] Erro ao verificar OTP token_hash:', e);
        }
      }

      // 4. Escuta evento PASSWORD_RECOVERY do Supabase
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        if (event === 'PASSWORD_RECOVERY' || (newSession && event === 'SIGNED_IN')) {
          if (isMounted) {
            setHasValidSession(true);
            setIsVerifyingSession(false);
          }
        }
      });

      // Se após 1.5 segundos não houver sessão nem token, encerra verificação
      setTimeout(() => {
        if (isMounted) {
          supabase.auth.getSession().then(({ data: { session: finalSession } }) => {
            if (isMounted) {
              setHasValidSession(Boolean(finalSession));
              setIsVerifyingSession(false);
            }
          });
        }
      }, 1500);

      return () => {
        subscription.unsubscribe();
      };
    };

    initRecoverySession();

    return () => {
      isMounted = false;
    };
  }, []);

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

      sessionStorage.removeItem('fitcoach_password_recovery');
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
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans select-none">
      {/* Main Container */}
      <div className="w-full max-w-md space-y-6 relative z-10 animate-in fade-in duration-300">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#2dd4bf] to-[#059669] shadow-[0_0_35px_rgba(45,212,191,0.28)] mb-2 p-0.5">
            <div className="w-full h-full rounded-[20px] bg-gradient-to-tr from-[#2dd4bf] via-[#10b981] to-[#059669] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-[#071915] stroke-[2.4]" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight text-white">FitCoach</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto">
            Defina sua nova senha de acesso
          </p>
        </div>

        {/* Card */}
        <div className="rounded-[28px] bg-[#121c1a]/70 backdrop-blur-2xl border border-white/[0.09] ring-1 ring-white/[0.05] p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
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
          ) : isVerifyingSession ? (
            <div className="text-center space-y-3 py-10 animate-in fade-in duration-300">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Verificando autorização de recuperação...</p>
            </div>
          ) : !hasValidSession ? (
            <div className="text-center space-y-5 py-3 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
                <ShieldAlert className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">
                  Link Expirado ou Sessão Ausente
                </h3>
                <p className="text-xs text-zinc-300 max-w-sm mx-auto leading-relaxed">
                  Para garantir a segurança da sua conta, a redefinição de senha exige abrir o link seguro enviado para o seu e-mail.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-xs text-zinc-400 text-left space-y-1">
                <p className="font-semibold text-zinc-300 text-[11px]">Como redefinir sua senha:</p>
                <p className="text-[11px] text-zinc-400">1. Clique no botão abaixo para solicitar um novo link.</p>
                <p className="text-[11px] text-zinc-400">2. Acesse seu e-mail e clique no botão de redefinição.</p>
                <p className="text-[11px] text-zinc-400">3. Você será redirecionado para cadastrar sua nova senha.</p>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to="/esqueci-senha"
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
                >
                  <span>Solicitar Novo Link de Recuperação</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <span>Voltar ao Login</span>
                </Link>
              </div>
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
