import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  checkRateLimit,
  recordAttempt,
  syncServerRateLimit,
  subscribeToRateLimit,
  formatSecondsToTime,
} from '../lib/rateLimiter';
import { TurnstileCaptcha } from '../components/common/TurnstileCaptcha';
import { verifyTurnstileToken } from '../lib/captcha';
import {
  Dumbbell,
  ShieldAlert,
  ArrowRight,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  HeartPulse,
  Timer,
  Activity,
  Flame,
  Link2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginAsPersonal, loginWithPassword, role } = useAuth();
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);

  // Rate Limiting (IP + Conta)
  useEffect(() => {
    const updateLockout = () => {
      const status = checkRateLimit('LOGIN', email);
      setRemainingAttempts(status.remainingAttempts);
      if (!status.allowed) {
        setLockoutSeconds(status.lockoutSeconds);
      } else {
        setLockoutSeconds(0);
      }
    };

    updateLockout();

    syncServerRateLimit('LOGIN', email).then((serverStatus) => {
      setRemainingAttempts(serverStatus.remainingAttempts);
      if (!serverStatus.allowed) {
        setLockoutSeconds(serverStatus.lockoutSeconds);
      }
    });

    const unsubscribe = subscribeToRateLimit(updateLockout);
    return () => unsubscribe();
  }, [email]);

  const isCaptchaRequired =
    lockoutSeconds === 0 && (failedAttempts >= 2 || (remainingAttempts <= 3 && remainingAttempts > 0));

  // Contador regressivo em tempo real
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    let cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'teste@fitcoach' || cleanEmail === 'teste@fitcoach.com') {
      cleanEmail = 'teste@fitcoach.com.br';
    }

    // 1. Verificação local
    const rateCheck = checkRateLimit('LOGIN', cleanEmail);
    if (!rateCheck.allowed) {
      setLockoutSeconds(rateCheck.lockoutSeconds);
      setErrorMessage(
        `Muitas tentativas falhas neste IP ou dispositivo. Por segurança, aguarde ${formatSecondsToTime(
          rateCheck.lockoutSeconds
        )}.`
      );
      return;
    }

    // 2. Verificação no servidor
    const serverRateCheck = await syncServerRateLimit('LOGIN', cleanEmail);
    if (!serverRateCheck.allowed) {
      setLockoutSeconds(serverRateCheck.lockoutSeconds);
      setErrorMessage(
        `Acesso temporariamente bloqueado para este endereço IP. Aguarde ${formatSecondsToTime(
          serverRateCheck.lockoutSeconds
        )}.`
      );
      return;
    }

    // 3. CAPTCHA se requerido
    if (isCaptchaRequired && !captchaToken) {
      setErrorMessage('Por favor, complete a verificação anti-bot abaixo para continuar.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    if (isCaptchaRequired && captchaToken) {
      const captchaCheck = await verifyTurnstileToken(captchaToken);
      if (!captchaCheck.success) {
        setErrorMessage(captchaCheck.error || 'Falha na validação anti-bot. Tente novamente.');
        setCaptchaToken('');
        setIsLoading(false);
        return;
      }
    }

    const isDemoLogin = cleanEmail === 'teste@fitcoach.com.br';
    if (isDemoLogin) {
      localStorage.setItem('fitcoach_demo_mode', 'true');
    } else {
      localStorage.removeItem('fitcoach_demo_mode');
    }

    try {
      // Redirecionamento Dev Master
      if (cleanEmail === 'dev.dev@fitcoach.com.br') {
        const result = await loginWithPassword(cleanEmail, password);
        if (!result.success) {
          const afterAttempt = recordAttempt('LOGIN', cleanEmail, false);
          setFailedAttempts((prev) => prev + 1);
          setCaptchaToken('');
          if (!afterAttempt.allowed) {
            setLockoutSeconds(afterAttempt.lockoutSeconds);
            setErrorMessage(
              `Limite de tentativas excedido! Bloqueado temporariamente por ${formatSecondsToTime(
                afterAttempt.lockoutSeconds
              )}.`
            );
          } else {
            setErrorMessage(
              `${result.error || 'Credenciais inválidas.'} (${afterAttempt.remainingAttempts} tentativas restantes)`
            );
          }
          setIsLoading(false);
          return;
        }
        recordAttempt('LOGIN', cleanEmail, true);
        setFailedAttempts(0);
        setCaptchaToken('');
        navigate('/master');
        return;
      }

      // Login Demo Oficial
      if (isDemoLogin && password === 'Contademo') {
        recordAttempt('LOGIN', cleanEmail, true);
        setFailedAttempts(0);
        setCaptchaToken('');
        const result = await loginWithPassword('teste@fitcoach.com.br', 'Contademo');
        if (result.success) {
          navigate('/dashboard');
          return;
        }
        loginAsPersonal();
        navigate('/dashboard');
        return;
      }

      // Login Real
      const result = await loginWithPassword(cleanEmail, password);
      if (!result.success) {
        const afterAttempt = recordAttempt('LOGIN', cleanEmail, false);
        setFailedAttempts((prev) => prev + 1);
        setCaptchaToken('');
        if (!afterAttempt.allowed) {
          setLockoutSeconds(afterAttempt.lockoutSeconds);
          setErrorMessage(
            `Limite de tentativas de login excedido! Por segurança, seu acesso foi temporariamente suspenso por ${formatSecondsToTime(
              afterAttempt.lockoutSeconds
            )}.`
          );
        } else {
          setErrorMessage(
            `${result.error || 'Credenciais inválidas. Verifique seu e-mail e senha.'} (${afterAttempt.remainingAttempts} tentativas restantes)`
          );
        }
        setIsLoading(false);
        return;
      }

      // Sucesso
      recordAttempt('LOGIN', cleanEmail, true);
      setFailedAttempts(0);
      setCaptchaToken('');

      const targetRole = result.role || role;
      if (targetRole === 'MASTER') {
        navigate('/master');
      } else if (targetRole === 'STUDENT') {
        navigate('/portal-aluno');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      recordAttempt('LOGIN', cleanEmail, false);
      setFailedAttempts((prev) => prev + 1);
      setCaptchaToken('');
      setErrorMessage(err.message || 'Erro ao realizar login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-zinc-100 flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-sans select-none">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[450px] relative z-10 space-y-6"
      >
        {/* Top Header: Logo + Title + Subtitle */}
        <div className="text-center space-y-2.5">
          {/* Glowing Squircle Logo with Dumbbell */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#2dd4bf] to-[#059669] p-0.5 shadow-[0_0_35px_rgba(45,212,191,0.28)] mx-auto flex items-center justify-center cursor-pointer transition-shadow"
          >
            <div className="w-full h-full rounded-[20px] bg-gradient-to-tr from-[#2dd4bf] via-[#10b981] to-[#059669] flex items-center justify-center">
              <Dumbbell className="w-8 h-8 text-[#071915] stroke-[2.4]" />
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <h1 className="text-[26px] font-bold tracking-tight text-white">FitCoach</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              PRO
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Plataforma All-In-One para Personal Trainers e Portal<br />Integrado do Aluno
          </p>
        </div>

        {/* The Glassmorphism Card */}
        <div className="p-7 rounded-[28px] bg-[#121c1a]/70 backdrop-blur-2xl border border-white/[0.09] shadow-[0_25px_60px_rgba(0,0,0,0.7)] space-y-5 relative overflow-hidden ring-1 ring-white/[0.05]">
          {/* Subtle top edge glow reflection */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Form Header */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              ACESSE SUA CONTA
            </span>
            <span className="text-[10px] bg-[#102420] text-emerald-300 border border-emerald-500/20 px-3 py-1 rounded-full font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Ambiente Seguro
            </span>
          </div>

          <form onSubmit={handleRealLogin} className="space-y-4">
            {/* Input E-mail */}
            <div className="space-y-1.5">
              <label className="block text-xs font-normal text-zinc-300">
                E-mail ou Usuário de Acesso
              </label>
              <div className="relative group">
                <Mail className="w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com ou Teste@fitcoach"
                  className="w-full bg-[#091110]/85 border border-white/[0.07] rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>
            </div>

            {/* Input Senha */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-normal text-zinc-300">Senha</label>
                <Link
                  to="/recuperar-senha"
                  className="text-xs text-zinc-400 hover:text-emerald-400 transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="w-4 h-4 text-zinc-500 group-focus-within:text-emerald-400 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha de acesso"
                  className="w-full bg-[#091110]/85 border border-white/[0.07] rounded-xl pl-10 pr-10 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none cursor-pointer"
                  tabIndex={-1}
                  title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Bloqueio Temporário Rate Limiter */}
            {lockoutSeconds > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in">
                <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-rose-200">Acesso Bloqueado Temporariamente</p>
                  <p className="text-[11px] text-zinc-300">
                    Muitas tentativas sem sucesso. Por segurança, tente novamente em:
                  </p>
                  <p className="text-sm font-mono font-bold text-rose-400 mt-1">
                    {formatSecondsToTime(lockoutSeconds)}
                  </p>
                </div>
              </div>
            )}

            {/* Mensagem de Erro Geral */}
            {errorMessage && lockoutSeconds === 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Desafio CAPTCHA Adaptativo */}
            {isCaptchaRequired && lockoutSeconds === 0 && (
              <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/[0.08] my-2">
                <TurnstileCaptcha
                  action="login"
                  onVerify={(token) => {
                    setCaptchaToken(token);
                    setErrorMessage('');
                  }}
                  onExpire={() => setCaptchaToken('')}
                  onError={(err) => setErrorMessage(err || 'Erro ao validar desafio anti-bot.')}
                />
              </div>
            )}

            {/* Botão Entrar na Plataforma */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading || lockoutSeconds > 0}
              className="w-full py-3.5 rounded-2xl bg-[#10b981] hover:bg-[#059669] text-[#061814] font-semibold text-sm transition-all shadow-[0_4px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#061814]" />
                  <span>Entrando na plataforma...</span>
                </>
              ) : lockoutSeconds > 0 ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#061814]" />
                  <span>Acesso Bloqueado ({formatSecondsToTime(lockoutSeconds)})</span>
                </>
              ) : (
                <>
                  <span>Entrar na Plataforma</span>
                  <ArrowRight className="w-4 h-4 text-[#061814] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>

          {/* Subcard de Convite */}
          <div className="p-3.5 rounded-2xl bg-[#091312]/80 border border-white/[0.05] text-center space-y-1">
            <p className="text-xs text-zinc-400">
              Recebeu um convite de professor ou do treinador?
            </p>
            <Link
              to="/cadastro"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ativar meu acesso com Código de Convite</span>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
