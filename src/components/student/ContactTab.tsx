import React, { useState, useEffect, useRef } from 'react';
import { Student, ChatMessage, ChatMedia } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { MediaUploadModal } from '../common/MediaUploadModal';
import { ChatMediaBubble } from '../common/ChatMediaBubble';
import {
  Send,
  HelpCircle,
  Calendar,
  CreditCard,
  Target,
  ShieldCheck,
  CheckCheck,
  Check,
  Sparkles,
  ExternalLink,
  Paperclip
} from 'lucide-react';
import { sanitizeUrl } from '../../lib/security';

interface ContactTabProps {
  student: Student;
}

export const ContactTab: React.FC<ContactTabProps> = ({ student }) => {
  const { personal, messages, sendMessage, markMessagesAsRead } = useAppData();
  const [inputText, setInputText] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filtrar apenas as mensagens desta thread (deste aluno)
  const threadMessages = messages.filter((m) => m.studentId === student.id);

  // Ao abrir o chat, marcar mensagens do coach como lidas
  useEffect(() => {
    markMessagesAsRead(student.id, 'STUDENT');
  }, [student.id, threadMessages.length]);

  // Auto-scroll para o final das mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const handleSend = (e?: React.FormEvent, customText?: string, category?: ChatMessage['category']) => {
    if (e) e.preventDefault();
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    sendMessage(student.id, 'STUDENT', textToSend.trim(), category || 'GERAL');
    setInputText('');
  };

  const quickPrompts = [
    {
      label: 'Dúvida de Exercício',
      icon: HelpCircle,
      category: 'DUVIDA' as const,
      text: 'Oi coach! Fiquei com uma dúvida na execução de um exercício da minha ficha. Pode me dar uma dica postural?',
    },
    {
      label: 'Remarcar Horário',
      icon: Calendar,
      category: 'AGENDAMENTO' as const,
      text: 'Olá coach! Tive um imprevisto e gostaria de verificar se conseguimos remarcar nosso próximo treino presencial.',
    },
    {
      label: 'Comprovante Enviado',
      icon: CreditCard,
      category: 'PAGAMENTO' as const,
      text: 'Oi Marcus! Acabei de efetuar o pagamento da mensalidade via PIX no sistema. Confirmando o recebimento!',
    },
    {
      label: 'Agendar Avaliação',
      icon: Target,
      category: 'AVALIACAO' as const,
      text: 'Oi coach! Gostaria de agendar a minha próxima reavaliação física para medirmos o progresso das medidas.',
    },
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6 flex flex-col h-[calc(100dvh-114px)] md:h-screen max-w-5xl mx-auto w-full min-h-0">
      {/* Header do Chat Interno */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md flex items-center justify-between shrink-0 mb-2.5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={sanitizeUrl(personal.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces')}
              alt={personal.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#09090b] rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-zinc-100 text-sm">{personal.name}</h3>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            </div>
            <p className="text-[11px] text-zinc-400 font-mono">
              CREF: {personal.cref} • <span className="text-zinc-400 font-sans">Canal Direto</span>
            </p>
          </div>
        </div>

        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-medium">
          Online no Sistema
        </span>
      </div>

      {/* Pílulas de Ações Rápidas Inteligentes */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0">
        {quickPrompts.map((p, idx) => {
          const Icon = p.icon;
          return (
            <button
              key={idx}
              onClick={() => handleSend(undefined, p.text, p.category)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 border border-white/[0.06] hover:border-white/[0.12] text-[11px] font-medium text-zinc-300 hover:text-zinc-100 transition-all shrink-0 shadow-subtle active:scale-[0.98]"
              title="Clique para enviar esta mensagem instantaneamente"
            >
              <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>

      {/* Área de Mensagens (Thread) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 rounded-2xl bg-zinc-900/40 border border-white/[0.06] my-1 shadow-soft-card backdrop-blur-md">
        {threadMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-300 border border-white/[0.04]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-zinc-200">Canal com seu treinador</h4>
            <p className="text-xs max-w-xs text-zinc-400">
              Envie dúvidas sobre a execução dos exercícios ou use os atalhos rápidos acima.
            </p>
          </div>
        ) : (
          threadMessages.map((msg) => {
            const isMe = msg.senderRole === 'STUDENT';

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 shadow-subtle ${
                    isMe
                      ? 'bg-zinc-100 text-zinc-950 font-medium rounded-tr-none'
                      : 'bg-zinc-800/80 border border-white/[0.06] text-zinc-100 rounded-tl-none'
                  }`}
                >
                  {!isMe && (
                    <span className="text-[10px] font-semibold text-emerald-400 block mb-0.5">
                      {msg.senderName} (Coach)
                    </span>
                  )}

                  {/* Renderização de Mídia (Foto ou Vídeo) se presente */}
                  {msg.media && (
                    <ChatMediaBubble media={msg.media} isMe={isMe} />
                  )}

                  {msg.content && (
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  )}

                  <div
                    className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-mono ${
                      isMe ? 'text-zinc-500' : 'text-zinc-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      msg.read ? (
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Barra de Digitação Fixa */}
      <form
        onSubmit={handleSend}
        className="p-2 bg-zinc-900/80 border border-white/[0.08] rounded-2xl flex items-center gap-1.5 shadow-soft-card shrink-0 mt-2 backdrop-blur-md"
      >
        {/* Input de Arquivo Oculto e Botão de Anexo */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setSelectedMediaFile(file);
              setIsMediaModalOpen(true);
            }
            e.target.value = '';
          }}
          accept="image/*,video/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/80 transition-colors shrink-0"
          title="Enviar foto ou vídeo"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Mensagem para Coach ${personal.name}...`}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-30 text-zinc-950 font-medium transition-all shadow-subtle active:scale-[0.98]"
        >
          <Send className="w-4 h-4 stroke-[2.5]" />
        </button>
      </form>

      {/* Modal de Upload e Compressão de Mídia */}
      <MediaUploadModal
        isOpen={isMediaModalOpen}
        onClose={() => {
          setIsMediaModalOpen(false);
          setSelectedMediaFile(null);
        }}
        file={selectedMediaFile}
        onSendMedia={(media, caption) => {
          sendMessage(student.id, 'STUDENT', caption, 'GERAL', media);
        }}
      />
    </div>
  );
};
