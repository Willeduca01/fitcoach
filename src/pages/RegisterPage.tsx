import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateInviteCode } from '../lib/supabase';
import { InviteValidationResult } from '../types';
import {
  Dumbbell,
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Lock,
  Mail,
  Phone,
  Sparkles,
  KeyRound,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { checkRateLimit, recordAttempt, formatSecondsToTime } from '../lib/rateLimiter';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signUpWithInviteCode } = useAuth();

  const urlInvite =
    searchParams.get('code') ||
    searchParams.get('convite') ||
    searchParams.get('invite') ||
    searchParams.get('token') ||
    '';
  const urlEmail = searchParams.get('email') || '';

  const [inviteCode, setInviteCode] = useState<string>(urlInvite.toUpperCase());
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationResult, setValidationResult] = useState<InviteValidationResult | null>(null);

  // Form State
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>(urlEmail);
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Validação automática se houver código na URL
  useEffect(() => {
    if (urlEmail) {
      setEmail(urlEmail);
    }
    if (urlInvite) {
      handleValidate(urlInvite, urlEmail);
    }
  }, [urlInvite, urlEmail]);

  const handleValidate = async (codeToValidate: string, prefillEmail?: string) => {
    const code = codeToValidate.trim().toUpperCase();
    if (!code) return;

    // Rate limit: previne força bruta de códigos de convite
    const rateCheck = checkRateLimit('INVITE_VALIDATION', 'global');
    if (!rateCheck.allowed) {
      setErrorMsg(`Muitas tentativas de validação de convite. Por segurança, aguarde ${formatSecondsToTime(rateCheck.lockoutSeconds)}.`);
      return;
    }

    setIsValidating(true);
    setErrorMsg('');
    try {
      const result = await validateInviteCode(code);
      setValidationResult(result);
      if (result.valid) {
        recordAttempt('INVITE_VALIDATION', 'global', true);
        if (result.targetName) setName(result.targetName);
        if (result.targetEmail) setEmail(result.targetEmail);
        else if (prefillEmail) setEmail(prefillEmail);
      } else {
        const afterAttempt = recordAttempt('INVITE_VALIDATION', 'global', false);
        if (!afterAttempt.allowed) {
          setErrorMsg(`Limite de tentativas de validação atingido! Aguarde ${formatSecondsToTime(afterAttempt.lockoutSeconds)}.`);
        } else {
          setErrorMsg(`Convite não encontrado, expirado ou já utilizado. (${afterAttempt.remainingAttempts} tentativas restantes)`);
        }
      }
    } catch {
      recordAttempt('INVITE_VALIDATION', 'global', false);
      setErrorMsg('Falha ao conectar para validar o convite.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!inviteCode) {
      setErrorMsg('O código de convite é obrigatório.');
      return;
    }

    if (!validationResult?.valid) {
      setErrorMsg('Por favor, valide um convite válido antes de continuar.');
      return;
    }

    if (!name.trim() || !email.trim() || !password) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem.');
      return;
    }

    // Rate limit para cadastro
    const signupCheck = checkRateLimit('SIGNUP', email || 'global');
    if (!signupCheck.allowed) {
      setErrorMsg(`Muitas tentativas de cadastro recentes. Aguarde ${formatSecondsToTime(signupCheck.lockoutSeconds)}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signUpWithInviteCode({
        name,
        email,
        phone,
        password,
        inviteCode,
      });

      if (!res.success) {
        recordAttempt('SIGNUP', email || 'global', false);
        setErrorMsg(res.error || 'Não foi possível concluir o cadastro.');
        setIsSubmitting(false);
        return;
      }

      recordAttempt('SIGNUP', email || 'global', true);
      setIsSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });

      setTimeout(() => {
        if (validationResult.inviteType === 'STUDENT') {
          navigate('/portal-aluno');
        } else {
          navigate('/dashboard');
        }
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado no cadastro.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden font-sans">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/10 mx-auto">
            <Dumbbell className="w-6 h-6 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">FitCoach</h1>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              CONVITE
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Acesso exclusivo por convite para Personal Trainers e Alunos vinculados
          </p>
        </div>

        {/* Main Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/80 space-y-6">
          {/* Step 1: Invite verification box */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              1. Código de Convite Obrigatório
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setValidationResult(null);
                  }}
                  placeholder="Ex: PROF-XXXX ou ALUNO-YYYY"
                  disabled={isSubmitting || isSuccess}
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 font-mono tracking-wider focus:outline-none focus:border-emerald-500/50 transition-colors uppercase"
                />
              </div>
              <button
                type="button"
                onClick={() => handleValidate(inviteCode)}
                disabled={!inviteCode || isValidating || isSubmitting}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs font-semibold rounded-xl text-zinc-200 border border-white/[0.06] transition-colors flex items-center gap-1.5"
              >
                {isValidating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Validar'}
              </button>
            </div>

            {/* Validation Banner */}
            {validationResult?.valid && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    {validationResult.inviteType === 'STUDENT'
                      ? 'Convite de Aluno Confirmado!'
                      : 'Convite Oficial de Treinador Confirmado!'}
                  </span>
                </div>
                <p className="text-zinc-300 pl-6">
                  {validationResult.inviteType === 'STUDENT' ? (
                    <>
                      Você está sendo vinculado ao Personal Trainer:{' '}
                      <strong className="text-emerald-300">{validationResult.personalName}</strong>
                      {validationResult.plan && ` (Plano ${validationResult.plan})`}.
                    </>
                  ) : (
                    <>Convite emitido pelo Administrador Master para acesso de Personal Trainer.</>
                  )}
                </p>
              </div>
            )}

            {validationResult && !validationResult.valid && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Convite inválido, expirado ou já resgatado. Solicite um novo código.</span>
              </div>
            )}
          </div>

          {/* Step 2: Registration Form */}
          {validationResult?.valid && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-white/[0.06] animate-in fade-in duration-300">
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                2. Seus Dados de Acesso
              </label>

              {/* Nome */}
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">E-mail</label>
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
                  <label className="block text-xs text-zinc-400 mb-1">WhatsApp / Telefone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Senha e Confirmação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 dígitos"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                      aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-10 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
                      tabIndex={-1}
                      title={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                      aria-label={showPassword ? 'Ocultar senha' : 'Visualizar senha'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || isSuccess}
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm transition-all shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Criando sua conta...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Conta Criada! Redirecionando...</span>
                  </>
                ) : (
                  <>
                    <span>Concluir Cadastro</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer link to Login */}
          <div className="pt-4 border-t border-white/[0.06] text-center">
            <p className="text-xs text-zinc-400">
              Já possui uma conta ativa?{' '}
              <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
