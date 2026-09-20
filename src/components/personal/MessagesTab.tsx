import React, { useState, useEffect, useRef } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Student, ChatMessage, ChatMedia } from '../../types';
import { Badge } from '../common/Badge';
import { MediaUploadModal } from '../common/MediaUploadModal';
import { ChatMediaBubble } from '../common/ChatMediaBubble';
import {
  MessageSquare,
  Search,
  Send,
  CheckCheck,
  Check,
  User,
  Flame,
  Calendar,
  Sparkles,
  ExternalLink,
  Paperclip
} from 'lucide-react';

interface MessagesTabProps {
  initialStudentId?: string;
  onOpenStudentDetail?: (student: Student) => void;
}

export const MessagesTab: React.FC<MessagesTabProps> = ({
  initialStudentId,
  onOpenStudentDetail,
}) => {
  const { students, messages, sendMessage, markMessagesAsRead } = useAppData();

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || students[0]?.id || 'student-1'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [inputText, setInputText] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || students[0];

  // Marcar mensagens do aluno selecionado como lidas pelo treinador
  useEffect(() => {
    if (selectedStudentId) {
      markMessagesAsRead(selectedStudentId, 'PERSONAL');
    }
  }, [selectedStudentId, messages.length]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedStudentId, messages.length]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedStudent) return;

    sendMessage(selectedStudent.id, 'PERSONAL', text.trim(), 'GERAL');
    setInputText('');
  };

  const currentThread = messages.filter((m) => m.studentId === selectedStudent?.id);

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const quickReplies = [
    'Confirmado! Te vejo na nossa sessão.',
    'Excelente evolução! Continue assim.',
    'Pode reduzir 2kg de cada lado e manter o controle postural.',
    'Recebido! Já dei baixa aqui no sistema, obrigado.',
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full h-[calc(100dvh-114px)] md:h-screen flex flex-col space-y-3 font-sans min-h-0">
      {/* Top Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Mini CRM de Atendimento & Mensagens
          </h1>
          <p className="text-xs text-zinc-400">
            Comunicação direta e centralizada com todos os seus alunos ativos sem sair do sistema.
          </p>
        </div>
      </div>

      {/* Main Split Layout: Inbox List (Left) + Chat Thread (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Students Inbox List (4 cols) */}
        <div className="md:col-span-4 lg:col-span-4 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-3 flex flex-col min-h-0 shadow-2xl shadow-black/40">
          {/* Search Box */}
          <div className="relative mb-2.5 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar aluno na conversa..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-zinc-950/60 border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
          </div>

          {/* Student Threads List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredStudents.map((student) => {
              const studentMsgs = messages.filter((m) => m.studentId === student.id);
              const lastMsg = studentMsgs[studentMsgs.length - 1];
              const unreadCount = studentMsgs.filter((m) => m.senderRole === 'STUDENT' && !m.read).length;
              const isSelected = student.id === selectedStudent?.id;

              return (
                <button
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 border ${
                    isSelected
                      ? 'bg-zinc-800/90 border-white/[0.1] shadow-sm text-zinc-100'
                      : 'bg-zinc-900/30 hover:bg-zinc-800/40 border-transparent hover:border-white/[0.06] text-zinc-400'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={student.avatarUrl}
                      alt={student.name}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                    />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className={`text-xs font-semibold truncate ${isSelected ? 'text-zinc-100' : 'text-zinc-200'}`}>
                        {student.name}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">
                          {lastMsg.timestamp.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate">
                      {lastMsg ? lastMsg.content : 'Nenhuma mensagem recente'}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
                          student.paymentStatus === 'EM_DIA'
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                            : student.paymentStatus === 'VENCE_EM_BREVE'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                        }`}
                      >
                        {student.paymentStatus === 'EM_DIA' ? 'Em dia' : student.paymentStatus === 'VENCE_EM_BREVE' ? '3 dias' : 'Atrasado'}
                      </span>
                      <span className="text-[9px] text-zinc-500 font-mono">
                        {student.plan}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Chat Thread (8 cols) */}
        <div className="md:col-span-8 lg:col-span-8 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] flex flex-col min-h-0 shadow-2xl shadow-black/40 overflow-hidden">
          {/* Thread Header */}
          <div className="p-3.5 border-b border-white/[0.06] flex items-center justify-between bg-zinc-900/80 rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <img
                src={selectedStudent?.avatarUrl}
                alt={selectedStudent?.name}
                className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-100 text-sm">{selectedStudent?.name}</h3>
                  <Badge
                    variant={
                      selectedStudent?.paymentStatus === 'EM_DIA'
                        ? 'success'
                        : selectedStudent?.paymentStatus === 'VENCE_EM_BREVE'
                        ? 'warning'
                        : 'danger'
                    }
                    size="sm"
                  >
                    {selectedStudent?.paymentStatus === 'EM_DIA'
                      ? 'Em dia'
                      : selectedStudent?.paymentStatus === 'VENCE_EM_BREVE'
                      ? 'Vence em 3d'
                      : 'Atrasado'}
                  </Badge>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Meta: <span className="text-emerald-300 font-medium">{selectedStudent?.primaryGoal}</span>
                </p>
              </div>
            </div>

            {onOpenStudentDetail && selectedStudent && (
              <button
                onClick={() => onOpenStudentDetail(selectedStudent)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
              >
                <span>Ver Ficha</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950/40">
            {currentThread.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6 text-zinc-500 text-xs">
                Inicie uma conversa com {selectedStudent?.name}.
              </div>
            ) : (
              currentThread.map((msg) => {
                const isMe = msg.senderRole === 'PERSONAL';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                        isMe
                          ? 'bg-emerald-500 text-zinc-950 font-medium rounded-tr-none'
                          : 'bg-zinc-800/90 border border-white/[0.06] text-zinc-100 rounded-tl-none'
                      }`}
                    >
                      {!isMe && (
                        <span className="text-[10px] font-semibold text-zinc-400 block mb-0.5">
                          {msg.senderName} (Aluno)
                        </span>
                      )}

                      {/* Renderização de Mídia se presente */}
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
                          isMe ? 'text-zinc-900/80' : 'text-zinc-400'
                        }`}
                      >
                        <span>{msg.timestamp}</span>
                        {isMe && (
                          msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-zinc-950" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-zinc-900/70" />
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

          {/* Quick Replies for Coach */}
          <div className="p-2 border-t border-white/[0.06] bg-zinc-900/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
            {quickReplies.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSend(r)}
                className="px-2.5 py-1 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.06] text-[11px] text-zinc-300 hover:text-zinc-100 whitespace-nowrap transition-colors shrink-0"
              >
                {r}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-white/[0.06] bg-zinc-900/90 rounded-b-2xl flex items-center gap-2 shrink-0"
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
              placeholder={`Escrever resposta para ${selectedStudent?.name?.split(' ')[0]}...`}
              className="flex-1 bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-zinc-950 font-semibold transition-all shadow-sm"
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
              if (selectedStudent) {
                sendMessage(selectedStudent.id, 'PERSONAL', caption, 'GERAL', media);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
