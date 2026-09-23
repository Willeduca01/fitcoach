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
  ExternalLink,
  Paperclip,
  ArrowLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { sanitizeUrl } from '../../lib/security';

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
    initialStudentId || students[0]?.id || ''
  );
  // No mobile, se veio com initialStudentId começa no chat, senão começa na lista de alunos
  const [isChatOpen, setIsChatOpen] = useState<boolean>(Boolean(initialStudentId));

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'overdue'>('all');
  const [inputText, setInputText] = useState('');
  const [selectedMediaFile, setSelectedMediaFile] = useState<File | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Se o prop initialStudentId mudar de fora, abre diretamente o chat
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
      setIsChatOpen(true);
    }
  }, [initialStudentId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) || (students.length > 0 ? students[0] : null);

  // Marcar mensagens do aluno selecionado como lidas pelo treinador quando o chat estiver aberto
  useEffect(() => {
    if (selectedStudentId && isChatOpen) {
      markMessagesAsRead(selectedStudentId, 'PERSONAL');
    }
  }, [selectedStudentId, isChatOpen, messages.length]);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedStudentId, isChatOpen, messages.length]);

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedStudent) return;

    sendMessage(selectedStudent.id, 'PERSONAL', text.trim(), 'GERAL');
    setInputText('');
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setIsChatOpen(true);
  };

  const currentThread = selectedStudent
    ? messages.filter((m) => m.studentId === selectedStudent.id)
    : [];

  // Alunos filtrados por busca e status
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    const studentMsgs = messages.filter((m) => m.studentId === s.id);
    const hasUnread = studentMsgs.some((m) => m.senderRole === 'STUDENT' && !m.read);

    if (filterType === 'unread') return hasUnread;
    if (filterType === 'overdue') return s.paymentStatus === 'ATRASADO';
    return true;
  });

  const totalUnread = messages.filter((m) => m.senderRole === 'STUDENT' && !m.read).length;

  const quickReplies = [
    'Confirmado! Te vejo na nossa sessão.',
    'Excelente evolução! Continue assim.',
    'Pode reduzir 2kg de cada lado e manter o controle postural.',
    'Recebido! Já dei baixa aqui no sistema, obrigado.',
  ];

  return (
    <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full h-[calc(100dvh-112px)] md:h-[calc(100vh-120px)] flex flex-col space-y-3 font-sans min-h-0">
      {/* Top Title: Visível no desktop sempre, e no mobile apenas quando a lista de alunos estiver em foco */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0 ${isChatOpen ? 'hidden md:flex' : 'flex'}`}>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            CRM de Atendimento & Mensagens
          </h1>
          <p className="text-xs text-zinc-400">
            Comunicação direta e centralizada com todos os seus alunos ativos.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {totalUnread > 0 ? `${totalUnread} mensagem${totalUnread > 1 ? 'ns' : ''} nova${totalUnread > 1 ? 's' : ''}` : 'Todas lidas'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 border border-white/[0.06] font-mono text-[11px]">
            {students.length} alunos
          </span>
        </div>
      </div>

      {/* Main Split Layout: Inbox CRM List (Left) + Chat Thread (Right) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Students CRM List
            No mobile: Visível quando !isChatOpen.
            No desktop: Sempre visível na coluna de 4 colunas. */}
        <div
          className={`md:col-span-4 lg:col-span-4 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-3 flex flex-col min-h-0 shadow-2xl shadow-black/40 ${
            isChatOpen ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header da Lista de CRM */}
          <div className="space-y-2 mb-2.5 shrink-0">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar aluno na conversa..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-zinc-950/70 border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                  filterType === 'all'
                    ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFilterType('unread')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                  filterType === 'unread'
                    ? 'bg-zinc-800 text-emerald-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Não Lidos</span>
                {totalUnread > 0 && (
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-zinc-950 text-[9px] font-bold flex items-center justify-center">
                    {totalUnread}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterType('overdue')}
                className={`flex-1 py-1 rounded-lg font-medium transition-all ${
                  filterType === 'overdue'
                    ? 'bg-zinc-800 text-rose-400 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Atrasados
              </button>
            </div>
          </div>

          {/* Student Threads List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredStudents.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
                <MessageSquare className="w-6 h-6 mb-2 opacity-40" />
                <p>Nenhum aluno encontrado no filtro.</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const studentMsgs = messages.filter((m) => m.studentId === student.id);
                const lastMsg = studentMsgs[studentMsgs.length - 1];
                const unreadCount = studentMsgs.filter((m) => m.senderRole === 'STUDENT' && !m.read).length;
                const isSelected = student.id === selectedStudent?.id;

                let lastMsgPreview = 'Toque para iniciar o atendimento';
                if (lastMsg) {
                  if (lastMsg.media) {
                    lastMsgPreview = lastMsg.media.type === 'video' ? '📹 Vídeo' : '📷 Foto';
                    if (lastMsg.content) lastMsgPreview += `: ${lastMsg.content}`;
                  } else {
                    lastMsgPreview = lastMsg.content;
                  }
                }

                return (
                  <button
                    key={student.id}
                    onClick={() => handleSelectStudent(student.id)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 border group ${
                      isSelected && isChatOpen
                        ? 'bg-zinc-800/90 border-emerald-500/30 shadow-md text-zinc-100'
                        : 'bg-zinc-900/40 hover:bg-zinc-800/50 border-white/[0.04] hover:border-white/[0.08] text-zinc-400'
                    }`}
                  >
                    <div className="relative shrink-0 mt-0.5">
                      <img
                        src={sanitizeUrl(student.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces')}
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-white/10"
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-zinc-950 font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse shadow-md">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-xs font-semibold truncate ${isSelected && isChatOpen ? 'text-emerald-300' : 'text-zinc-200'}`}>
                          {student.name}
                        </span>
                        {lastMsg && (
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0 ml-1">
                            {lastMsg.timestamp.split(' ')[0]}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 mb-1">
                        {lastMsg && lastMsg.senderRole === 'PERSONAL' && (
                          <CheckCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        )}
                        <p className={`text-[11px] truncate ${unreadCount > 0 ? 'text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                          {lastMsg && lastMsg.senderRole === 'PERSONAL' && (
                            <span className="text-zinc-500">Você: </span>
                          )}
                          {lastMsgPreview}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1.5">
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

                        <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Chat Thread
            No mobile: Visível quando isChatOpen for true.
            No desktop: Sempre visível na coluna de 8 colunas. */}
        <div
          className={`md:col-span-8 lg:col-span-8 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] flex-col min-h-0 shadow-2xl shadow-black/40 overflow-hidden ${
            isChatOpen ? 'flex' : 'hidden md:flex'
          }`}
        >
          {selectedStudent ? (
            <>
              {/* Thread Header */}
              <div className="p-3 sm:p-3.5 border-b border-white/[0.06] flex items-center justify-between bg-zinc-900/80 rounded-t-2xl shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Botão Voltar para mobile: Retorna para a lista de CRM */}
                  <button
                    type="button"
                    onClick={() => setIsChatOpen(false)}
                    className="md:hidden p-2 -ml-1 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors flex items-center justify-center shrink-0"
                    title="Voltar para a lista de alunos"
                    aria-label="Voltar para a lista de alunos"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <img
                    src={sanitizeUrl(selectedStudent.avatarUrl, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces')}
                    alt={selectedStudent.name}
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-semibold text-zinc-100 text-xs sm:text-sm truncate">
                        {selectedStudent.name}
                      </h3>
                      <Badge
                        variant={
                          selectedStudent.paymentStatus === 'EM_DIA'
                            ? 'success'
                            : selectedStudent.paymentStatus === 'VENCE_EM_BREVE'
                            ? 'warning'
                            : 'danger'
                        }
                        size="sm"
                      >
                        {selectedStudent.paymentStatus === 'EM_DIA'
                          ? 'Em dia'
                          : selectedStudent.paymentStatus === 'VENCE_EM_BREVE'
                          ? 'Vence em 3d'
                          : 'Atrasado'}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate">
                      Meta: <span className="text-emerald-300 font-medium">{selectedStudent.primaryGoal || 'Condicionamento Geral'}</span>
                    </p>
                  </div>
                </div>

                {onOpenStudentDetail && (
                  <button
                    onClick={() => onOpenStudentDetail(selectedStudent)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors shrink-0"
                  >
                    <span>Ver Ficha</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-zinc-950/40">
                {currentThread.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 text-xs space-y-1">
                    <MessageSquare className="w-8 h-8 opacity-40 text-emerald-400" />
                    <p className="font-medium text-zinc-400">Nenhuma mensagem nesta conversa.</p>
                    <p>Envie uma mensagem abaixo para iniciar o atendimento a {selectedStudent.name}.</p>
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
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
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
                            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
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
                className="p-2.5 sm:p-3 border-t border-white/[0.06] bg-zinc-900/90 rounded-b-2xl flex items-center gap-2 shrink-0"
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
                  placeholder={`Escrever resposta para ${selectedStudent.name?.split(' ')[0]}...`}
                  className="flex-1 bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-2 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-30 disabled:hover:bg-emerald-500 text-zinc-950 font-semibold transition-all shadow-sm shrink-0"
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
                  sendMessage(selectedStudent.id, 'PERSONAL', caption, 'GERAL', media);
                }}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-zinc-500 space-y-2">
              <MessageSquare className="w-10 h-10 opacity-30 text-emerald-400" />
              <h4 className="text-sm font-semibold text-zinc-300">Nenhum aluno selecionado</h4>
              <p className="text-xs text-zinc-500 max-w-xs">
                Selecione um aluno na lista de CRM à esquerda para visualizar o histórico de mensagens e responder.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
