import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sendPasswordResetEmail as sendResendResetEmail } from '../services/emailService';
import {
  checkRateLimit,
  recordAttempt,
  syncServerRateLimit,
  subscribeToRateLimit,
  formatSecondsToTime
} from '../lib/rateLimiter';
import { TurnstileCaptcha } from '../components/common/TurnstileCaptcha';
import { verifyTurnstileToken } from '../lib/captcha';
import {
  Dumbbell,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  KeyRound,
  Send
} from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string>('');

  // Monitora bloqueio de rate limit (IP, Dispositivo e E-mail)
  useEffect(() => {
    const updateLockout = () => {
      const status = checkRateLimit('EMAIL_SEND', email);
      if (!status.allowed) {
        setLockoutSeconds(status.lockoutSeconds);
      } else {
        setLockoutSeconds(0);
      }
    };

    updateLockout();

    syncServerRateLimit('EMAIL_SEND', email).then((serverStatus) => {
      if (!serverStatus.allowed) {
        setLockoutSeconds(serverStatus.lockoutSeconds);
      }
    });

    const unsubscribe = subscribeToRateLimit(updateLockout);
    return () => unsubscribe();
  }, [email]);

  // Contador regressivo caso bloqueado
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const cleanEmail = email.trim().toLowerCase();

    // Verificação de Rate Limit (IP + Dispositivo)
    const rateCheck = checkRateLimit('EMAIL_SEND', cleanEmail);
    if (!rateCheck.allowed) {
      setLockoutSeconds(rateCheck.lockoutSeconds);
      setErrorMessage(`Muitas solicitações recentes neste IP ou dispositivo. Aguarde ${formatSecondsToTime(rateCheck.lockoutSeconds)}.`);
      return;
    }

    const serverCheck = await syncServerRateLimit('EMAIL_SEND', cleanEmail);
    if (!serverCheck.allowed) {
      setLockoutSeconds(serverCheck.lockoutSeconds);
      setErrorMessage(`Limite de solicitações atingido para este IP/conta. Aguarde ${formatSecondsToTime(serverCheck.lockoutSeconds)}.`);
      return;
    }

    if (!captchaToken) {
      setErrorMessage('Por favor, complete a verificação anti-bot abaixo para enviar o link.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    const captchaCheck = await verifyTurnstileToken(captchaToken);
    if (!captchaCheck.success) {
      setErrorMessage(captchaCheck.error || 'Falha na validação de segurança anti-bot.');
      setCaptchaToken('');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Envia o e-mail de recuperação formatado pelo nosso serviço de e-mail (Gmail SMTP com link assinado do Supabase)
      const origin = window.location.origin;
      const basePath = window.location.pathname.startsWith('/fitcoach') ? '/fitcoach' : '';
      const fallbackResetUrl = `${origin}${basePath}/#/redefinir-senha?email=${encodeURIComponent(cleanEmail)}`;

      const res = await sendResendResetEmail({
        toEmail: cleanEmail,
        resetUrl: fallbackResetUrl,
      });

      if (!res.success) {
        // Fallback: Dispara diretamente pelo Supabase Auth caso o endpoint não responda
        const supabaseRes = await sendPasswordResetEmail(cleanEmail);
        if (!supabaseRes.success) {
          recordAttempt('EMAIL_SEND', cleanEmail, false);
          setCaptchaToken('');
          setErrorMessage(supabaseRes.error || res.error || 'Não foi possível processar a solicitação de redefinição.');
          setIsLoading(false);
          return;
        }
      }

      recordAttempt('EMAIL_SEND', cleanEmail, true);
      setCaptchaToken('');
      setIsSuccess(true);
    } catch (err: any) {
      recordAttempt('EMAIL_SEND', cleanEmail, false);
      setCaptchaToken('');
      setErrorMessage(err.message || 'Erro inesperado ao solicitar recuperação de senha.');
    } finally {
      setIsLoading(false);
    }
  };

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
            Recuperação e troca de senha de acesso
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-white/[0.08] p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6">
          {isSuccess ? (
            <div className="text-center space-y-5 py-3 animate-in fade-in duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <Send className="w-7 h-7" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">
                  E-mail de Recuperação Enviado!
                </h3>
                <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                  Enviamos as instruções e o link seguro de redefinição para:
                  <br />
                  <strong className="text-emerald-400 font-medium">{email}</strong>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-left text-xs text-zinc-400 space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-200 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Próximos Passos:</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  1. Abra seu Gmail ou caixa de entrada.
                </p>
                <p className="text-[11px] text-zinc-400">
                  2. Clique no botão "Redefinir Minha Senha".
                </p>
                <p className="text-[11px] text-zinc-400">
                  3. Escolha uma nova senha de no mínimo 6 dígitos.
                </p>
              </div>

              <div className="pt-2 space-y-2">
                <Link
                  to="/login"
                  className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Voltar para a Tela de Login</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsSuccess(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Não recebeu? Enviar novamente
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                  <span>Esqueceu sua senha?</span>
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Digite o e-mail cadastrado na sua conta (professor ou aluno). Enviaremos um link de confirmação para você cadastrar uma nova senha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">
                    E-mail Cadastrado
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu.email@exemplo.com"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Rate limit lockout warning */}
                {lockoutSeconds > 0 && (
                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs animate-in fade-in">
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold text-rose-200">Envio Bloqueado Temporariamente</p>
                      <p className="text-[11px] text-zinc-300">
                        Muitas tentativas. Aguarde: <span className="font-mono font-bold text-rose-400">{formatSecondsToTime(lockoutSeconds)}</span>
                      </p>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {errorMessage && lockoutSeconds === 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Desafio anti-bot Turnstile */}
                {lockoutSeconds === 0 && (
                  <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/[0.08] my-2">
                    <TurnstileCaptcha
                      action="forgot_password"
                      onVerify={(token) => {
                        setCaptchaToken(token);
                        setErrorMessage('');
                      }}
                      onExpire={() => setCaptchaToken('')}
                      onError={(err) => setErrorMessage(err || 'Erro no desafio anti-bot.')}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || lockoutSeconds > 0}
                  className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enviando link...</span>
                    </>
                  ) : lockoutSeconds > 0 ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-zinc-950" />
                      <span>Aguarde ({formatSecondsToTime(lockoutSeconds)})</span>
                    </>
                  ) : (
                    <>
                      <span>Enviar Link de Recuperação</span>
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
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Lembrou da senha? Voltar ao login</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
