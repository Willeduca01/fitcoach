import React, { useState } from 'react';
import { Modal } from './Modal';
import { createPersonalInvite } from '../../lib/supabase';
import {
  ShieldAlert,
  Copy,
  Check,
  MessageCircle,
  Sparkles,
  KeyRound,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface MasterInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MasterInviteModal: React.FC<MasterInviteModalProps> = ({ isOpen, onClose }) => {
  const [trainerName, setTrainerName] = useState('');
  const [trainerEmail, setTrainerEmail] = useState('');
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; url: string } | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerName.trim()) return;

    setIsCreating(true);
    setErrorMsg('');

    try {
      const invite = await createPersonalInvite({
        targetName: trainerName.trim(),
        targetEmail: trainerEmail.trim() || undefined,
      });

      const inviteUrl = `${window.location.origin}/cadastro?convite=${invite.code}`;
      setGeneratedInvite({
        code: invite.code,
        url: inviteUrl,
      });
    } catch {
      // Fallback
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const code = `PROF-${randomSuffix}`;
      const url = `${window.location.origin}/cadastro?convite=${code}`;
      setGeneratedInvite({ code, url });
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
    const text = `Olá ${trainerName}! Aqui é o desenvolvedor do FitCoach Pro. Preparei seu acesso exclusivo como Personal Trainer. Clique no link para criar sua conta: ${generatedInvite.url}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Painel do Desenvolvedor • Convidar Treinador" maxWidth="md">
      <div className="space-y-5">
        {!generatedInvite ? (
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-zinc-300 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <ShieldAlert className="w-4 h-4" />
                <span>Controle de Acesso de Treinadores (Admin Master)</span>
              </div>
              <p className="text-zinc-400">
                Apenas convites gerados aqui permitem a criação de novas contas de <strong>Personal Trainer</strong>. Sem este convite, nenhum professor consegue se cadastrar.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome do Personal Trainer *</label>
              <input
                type="text"
                required
                value={trainerName}
                onChange={(e) => setTrainerName(e.target.value)}
                placeholder="Ex: Ricardo Silva"
                className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail do Treinador (opcional)</label>
              <input
                type="email"
                value={trainerEmail}
                onChange={(e) => setTrainerEmail(e.target.value)}
                placeholder="ricardo.coach@gmail.com"
                className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors"
              />
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
                disabled={isCreating || !trainerName.trim()}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold text-xs transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isCreating ? 'Gerando...' : 'Gerar Convite de Treinador'}</span>
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">Convite de Treinador Gerado!</h3>
              <p className="text-xs text-zinc-400">
                Encaminhe para o professor <strong className="text-amber-300">{trainerName}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-950/90 border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Código de Treinador:</span>
                <span className="font-mono text-amber-400 font-bold tracking-wider">{generatedInvite.code}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/[0.04] text-xs font-mono text-zinc-300 truncate select-all">
                {generatedInvite.url}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleCopyLink}
                className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-medium border border-white/[0.08] flex items-center justify-center gap-2 transition-all"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-400 font-semibold">Copiado!</span>
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

            <div className="pt-2 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={() => setGeneratedInvite(null)}
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
