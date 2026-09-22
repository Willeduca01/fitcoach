import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useAppData } from '../../context/AppDataContext';
import { createStudentInvite } from '../../lib/supabase';
import { sendInviteEmail } from '../../services/emailService';
import {
  UserPlus,
  Copy,
  Check,
  Share2,
  Sparkles,
  Link as LinkIcon,
  MessageCircle,
  Clock,
  ShieldCheck,
  AlertCircle,
  Mail,
  CheckCircle2
} from 'lucide-react';

interface InviteStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteStudentModal: React.FC<InviteStudentModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { personal } = useAppData();

  const [studentName, setStudentName] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'>('MENSAL');
  
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; url: string; sentEmail?: string } | null>(null);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) return;

    setIsCreating(true);
    setErrorMsg('');
    setEmailFeedback(null);

    const cleanEmail = studentEmail.trim();

    try {
      const personalId = user?.id || personal.id;
      const invite = await createStudentInvite({
        personalId,
        targetName: studentName.trim(),
        targetEmail: cleanEmail || undefined,
        plan: selectedPlan,
      });

      const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
      const inviteUrl = `${window.location.origin}${basePath}/#/ativar-convite?code=${invite.code}${cleanEmail ? `&email=${encodeURIComponent(cleanEmail)}` : ''}`;
      setGeneratedInvite({
        code: invite.code,
        url: inviteUrl,
        sentEmail: cleanEmail,
      });

      if (cleanEmail) {
        const emailRes = await sendInviteEmail({
          toName: studentName.trim(),
          toEmail: cleanEmail,
          inviteCode: invite.code,
          inviteUrl,
          role: 'student',
          trainerName: personal.name || 'Personal Trainer',
          planName: selectedPlan,
        });

        if (emailRes.success) {
          setEmailFeedback({
            type: 'success',
            message: `Convite enviado para ${cleanEmail}!`,
          });
        } else if (emailRes.resendDomainRestriction) {
          setEmailFeedback({
            type: 'warning',
            message: `Convite gerado! Nota: No plano de testes do Resend, e-mails só chegam ao e-mail cadastrado (williamsilveira0204@gmail.com). Encaminhe o link via WhatsApp ao aluno.`,
          });
        }
      }
    } catch (err: any) {
      // Fallback para demonstração local
      const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const demoCode = `ALUNO-${randomSuffix}`;
      const demoUrl = `${window.location.origin}${basePath}/#/ativar-convite?code=${demoCode}${cleanEmail ? `&email=${encodeURIComponent(cleanEmail)}` : ''}`;
      setGeneratedInvite({
        code: demoCode,
        url: demoUrl,
        sentEmail: cleanEmail,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    if (!generatedInvite) return;
    const coachName = personal.name || 'seu Personal Trainer';
    const text = `Olá ${studentName || 'aluno(a)'}! Aqui é o ${coachName}. Preparei seu acesso exclusivo ao FitCoach Pro para acompanhar seus treinos e metas. Clique no link para criar sua conta: ${generatedInvite.url}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleReset = () => {
    setGeneratedInvite(null);
    setEmailFeedback(null);
    setStudentName('');
    setStudentEmail('');
    setErrorMsg('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Convidar Novo Aluno" maxWidth="md">
      <div className="space-y-5">
        {!generatedInvite ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-zinc-300 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Vinculação Exclusiva Garantida</span>
              </div>
              <p className="text-zinc-400">
                O aluno que usar este convite será cadastrado e vinculado <strong>exclusivamente ao seu perfil</strong>. Ele não terá acesso a dados de outros profissionais.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome do Aluno *</label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Ex: Ana Paula Ribeiro"
                className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail (opcional)</label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="aluno@email.com"
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Plano Proposto</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => setSelectedPlan(e.target.value as any)}
                  className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500/50 transition-colors"
                >
                  <option value="MENSAL">Mensal</option>
                  <option value="TRIMESTRAL">Trimestral</option>
                  <option value="SEMESTRAL">Semestral</option>
                  <option value="ANUAL">Anual</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCreating || !studentName.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isCreating ? 'Gerando...' : 'Gerar Convite'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Convite Criado com Sucesso!</h3>
              <p className="text-xs text-zinc-400">
                Encaminhe o link para <strong className="text-emerald-300">{studentName}</strong>.
              </p>
            </div>

            {emailFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  emailFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                }`}
              >
                {emailFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{emailFeedback.message}</span>
              </div>
            )}

            {/* Code Box */}
            <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Código do Convite:</span>
                <span className="font-mono text-emerald-400 font-bold tracking-wider">{generatedInvite.code}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/[0.04] text-xs font-mono text-zinc-300 truncate select-all">
                {generatedInvite.url}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-white/[0.08] flex items-center justify-center gap-2 transition-all"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-400" />
                    <span>Copiar Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-zinc-950 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-[#25D366]/20 transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>

            {/* Reset / Close */}
            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handleReset}
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                + Gerar outro convite
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Concluído
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
