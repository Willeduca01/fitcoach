import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { SessionSchedule, SessionStatus } from '../../types';
import { INITIAL_SESSIONS, INITIAL_STUDENTS } from '../../data/mockData';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Dumbbell,
  ChevronLeft,
  ChevronRight,
  Filter,
  Monitor,
  Smartphone,
  LayoutGrid,
  Columns,
  Sparkles,
  Info
} from 'lucide-react';

export const ScheduleTab: React.FC = () => {
  const { sessions, students, addSession, updateSessionStatus } = useAppData();

  // Seletor de visualização (Auto / Desktop / Mobile APK)
  const [deviceView, setDeviceView] = useState<'auto' | 'desktop' | 'mobile'>('auto');
  // Modo de calendário para desktop: 'timegrid' (Grade de horários) ou 'grid' (Grade clássica de dias)
  const [desktopCalendarMode, setDesktopCalendarMode] = useState<'timegrid' | 'grid'>('timegrid');

  // Offset de semanas para navegação no calendário (0 = semana atual, 1 = próxima, -1 = anterior)
  const [weekOffset, setWeekOffset] = useState(0);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | SessionStatus>('ALL');

  // Modal para detalhe da sessão ao clicar
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<SessionSchedule | null>(null);

  // Modal para ver todas as sessões de um dia específico
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayName: string;
    dayNumber: number;
  } | null>(null);

  // Dados com fallback para demonstração (se a conta ainda não tiver sessões ou alunos cadastrados)
  const availableSessions = sessions.length > 0 ? sessions : INITIAL_SESSIONS;
  const availableStudents = students.length > 0 ? students : INITIAL_STUDENTS;
  const isUsingFallbackSessions = sessions.length === 0;

  // Formulário para nova sessão
  const [selectedStudentId, setSelectedStudentId] = useState(availableStudents[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('Smart Fit - Unidade Paulista');
  const [selectedRoutineId, setSelectedRoutineId] = useState('');

  // Obter dias da semana com suporte a navegação por weekOffset (Segunda a Domingo)
  const getWeekDates = (offset: number = 0) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 é domingo, 1 é segunda
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday + offset * 7);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      week.push({
        dateStr,
        dateObj: d,
        dayName: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][i],
        shortDayName: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i],
        dayNumber: d.getDate(),
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });
    }
    return week;
  };

  const weekDays = getWeekDates(weekOffset);

  // Intervalo de datas formatado para o cabeçalho do calendário
  const formatWeekRange = () => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0].dateObj;
    const end = weekDays[6].dateObj;

    const startDay = start.getDate();
    const endDay = end.getDate();

    const startMonth = start.toLocaleDateString('pt-BR', { month: 'long' });
    const endMonth = end.toLocaleDateString('pt-BR', { month: 'long' });
    const year = end.getFullYear();

    if (startMonth === endMonth) {
      return `${startDay} a ${endDay} de ${startMonth.charAt(0).toUpperCase() + startMonth.slice(1)} de ${year}`;
    }
    return `${startDay} de ${startMonth} a ${endDay} de ${endMonth} de ${year}`;
  };

  // Abrir modal de agendamento pré-configurado
  const handleOpenAddModal = (dateStr?: string, timeStr?: string) => {
    if (dateStr) setSessionDate(dateStr);
    if (timeStr) setSessionTime(timeStr);
    setIsAddModalOpen(true);
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const student = availableStudents.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const routine = student.workouts?.find((w) => w.id === selectedRoutineId);

    addSession({
      studentId: student.id,
      studentName: student.name,
      date: sessionDate,
      time: sessionTime,
      durationMinutes: Number(durationMinutes),
      location,
      status: 'AGENDADA',
      workoutRoutineId: routine?.id,
      routineName: routine?.name,
    });

    setIsAddModalOpen(false);
  };

  const filteredSessions = availableSessions.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const selectedStudentObj = availableStudents.find((s) => s.id === selectedStudentId);

  // Horários para a grade de horário (06:00 até 22:00)
  const timeSlots = [
    '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
    '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00', '20:00', '21:00', '22:00'
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <CalendarIcon className="w-7 h-7 text-emerald-400" />
            Agenda Semanal & Controle de Sessões
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de horários de treinos presenciais, academias e status das sessões.
          </p>
        </div>

        {/* Controles de Ação e Filtros */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Dispositivo (Auto / Desktop / Mobile APK) */}
          <div className="flex items-center bg-zinc-900/90 border border-white/[0.08] rounded-xl p-1 text-xs">
            <button
              onClick={() => setDeviceView('auto')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                deviceView === 'auto'
                  ? 'bg-zinc-800 text-zinc-100 border border-white/[0.06]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Alternar automaticamente conforme o tamanho da tela"
            >
              <span>Auto</span>
            </button>
            <button
              onClick={() => setDeviceView('desktop')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                deviceView === 'desktop'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Forçar visualização em Calendário Padrão Desktop"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setDeviceView('mobile')}
              className={`px-2.5 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                deviceView === 'mobile'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Forçar visualização Mobile (APK)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile (APK)</span>
            </button>
          </div>

          {/* Filtro de Status */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-white/[0.08] rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterStatus === 'ALL' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.06]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('AGENDADA')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterStatus === 'AGENDADA' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Agendadas
            </button>
            <button
              onClick={() => setFilterStatus('REALIZADA')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                filterStatus === 'REALIZADA' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Realizadas
            </button>
          </div>

          <button
            onClick={() => handleOpenAddModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agendar Sessão</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo se estiver exibindo dados de exemplo */}
      {isUsingFallbackSessions && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/20 text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Treinos de Demonstração Ativos:</strong> Como esta conta ainda não possui sessões agendadas no banco, o calendário exibe os dados de exemplo da semana para visualização.
            </span>
          </div>
          <button
            onClick={() => handleOpenAddModal()}
            className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 shrink-0 text-xs"
          >
            + Agendar treino real
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. VISUALIZAÇÃO DESKTOP: CALENDÁRIO PADRÃO               */}
      {/* ======================================================== */}
      <div
        className={`${
          deviceView === 'desktop'
            ? 'block'
            : deviceView === 'mobile'
            ? 'hidden'
            : 'hidden lg:block'
        } space-y-4`}
      >
        {/* Barra de Navegação do Calendário Desktop */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-900/70 border border-white/[0.08] p-3.5 rounded-2xl backdrop-blur-md">
          {/* Navegação Semanal */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-800/80 border border-white/[0.06] rounded-xl p-1">
              <button
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setWeekOffset(0)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  weekOffset === 0
                    ? 'bg-emerald-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-300 hover:bg-zinc-700/60'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
                title="Próxima semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Período da Semana */}
            <div>
              <span className="text-xs font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                {formatWeekRange()}
                {weekOffset === 0 && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Semana Atual
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Alternador de Modo do Calendário (Grade de Horários vs Grade Semanal) */}
          <div className="flex items-center gap-1 bg-zinc-800/80 border border-white/[0.06] rounded-xl p-1 text-xs">
            <button
              onClick={() => setDesktopCalendarMode('timegrid')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                desktopCalendarMode === 'timegrid'
                  ? 'bg-zinc-700 text-zinc-100 border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização com horários das 06:00 às 22:00 estilo Google Calendar"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Grade de Horários</span>
            </button>
            <button
              onClick={() => setDesktopCalendarMode('grid')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                desktopCalendarMode === 'grid'
                  ? 'bg-zinc-700 text-zinc-100 border border-white/[0.08]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Visualização em colunas amplas com os treinos do dia"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grade de Dias</span>
            </button>
          </div>
        </div>

        {/* MODALIDADE 1: GRADE DE HORÁRIOS (TIMEGRID COM CHIPS COMPACTOS E FIXOS) */}
        {desktopCalendarMode === 'timegrid' && (
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/60 backdrop-blur-md overflow-hidden shadow-2xl">
            {/* Header com os 7 Dias - Largura Fixa e Perfeita */}
            <div className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] border-b border-white/[0.08] bg-zinc-900/90 sticky top-0 z-20">
              <div className="p-3 border-r border-white/[0.08] flex items-center justify-center text-zinc-500 font-mono text-[11px] uppercase tracking-wider select-none">
                Horário
              </div>
              {weekDays.map((day) => {
                const daySessions = filteredSessions.filter((s) => s.date === day.dateStr);
                const count = daySessions.length;
                return (
                  <div
                    key={day.dateStr}
                    onClick={() => {
                      if (count > 0) {
                        setSelectedDayDetail({
                          dateStr: day.dateStr,
                          dayName: day.dayName,
                          dayNumber: day.dayNumber,
                        });
                      }
                    }}
                    className={`p-3 text-center border-r border-white/[0.06] last:border-r-0 transition-colors min-w-0 overflow-hidden ${
                      count > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                    } ${day.isToday ? 'bg-emerald-500/[0.08]' : ''}`}
                    title={count > 0 ? 'Clique para ver a agenda completa do dia' : undefined}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-zinc-400 truncate">
                      {day.shortDayName}
                    </span>
                    <div className="flex items-center justify-center gap-1.5 mt-0.5">
                      <span
                        className={`text-lg font-extrabold ${
                          day.isToday
                            ? 'text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/30'
                            : 'text-zinc-100'
                        }`}
                      >
                        {day.dayNumber}
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-500 block mt-0.5 font-medium truncate">
                      {count === 0 ? 'Livre' : `${count} treino${count > 1 ? 's' : ''}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Linhas de Horário (06:00 às 22:00) */}
            <div className="divide-y divide-white/[0.04] max-h-[640px] overflow-y-auto">
              {timeSlots.map((hour) => {
                const hourNumber = parseInt(hour.split(':')[0], 10);

                return (
                  <div
                    key={hour}
                    className="grid grid-cols-[70px_repeat(7,minmax(0,1fr))] min-h-[58px] transition-colors hover:bg-white/[0.01]"
                  >
                    {/* Coluna do Horário */}
                    <div className="p-2 border-r border-white/[0.08] text-right font-mono text-[11px] text-zinc-500 pr-3 flex items-start justify-end pt-2 select-none">
                      {hour}
                    </div>

                    {/* 7 Células de Dias - Colunas perfeitamente alinhadas sem quebra */}
                    {weekDays.map((day) => {
                      const matchingSessions = filteredSessions.filter((s) => {
                        if (s.date !== day.dateStr) return false;
                        const sHour = parseInt(s.time.split(':')[0], 10);
                        return sHour === hourNumber;
                      });

                      return (
                        <div
                          key={`${day.dateStr}-${hour}`}
                          onClick={() => {
                            if (matchingSessions.length === 0) {
                              handleOpenAddModal(day.dateStr, hour);
                            }
                          }}
                          className={`p-1.5 border-r border-white/[0.04] last:border-r-0 relative group transition-colors min-w-0 overflow-hidden cursor-pointer ${
                            day.isToday ? 'bg-emerald-500/[0.02]' : ''
                          } hover:bg-white/[0.03]`}
                        >
                          {matchingSessions.length === 0 ? (
                            <div className="h-full w-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 truncate">
                                + {hour}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-1 min-w-0">
                              {matchingSessions.map((session) => {
                                const isDone = session.status === 'REALIZADA';
                                const isCancelled = session.status === 'CANCELADA';

                                return (
                                  <div
                                    key={session.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSessionDetail(session);
                                    }}
                                    className={`px-2 py-1.5 rounded-lg border text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between gap-1.5 min-w-0 overflow-hidden ${
                                      isDone
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25'
                                        : isCancelled
                                        ? 'bg-rose-500/10 border-rose-500/20 text-zinc-400 line-through opacity-70'
                                        : 'bg-zinc-850 bg-zinc-900 border-white/[0.1] hover:border-emerald-500/40 text-zinc-200 hover:bg-zinc-800'
                                    }`}
                                    title={`${session.time} - ${session.studentName} (${session.status}) • Clique para ver detalhes`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${
                                          isDone
                                            ? 'bg-emerald-400'
                                            : isCancelled
                                            ? 'bg-rose-400'
                                            : 'bg-sky-400'
                                        }`}
                                      />
                                      <span className="font-semibold truncate text-[11px] text-zinc-100">
                                        {session.studentName}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[10px] text-zinc-400 font-bold shrink-0">
                                      {session.time}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODALIDADE 2: GRADE CLÁSSICA DE DIAS (CALENDAR MATRIX COM CARDS COMPACTOS) */}
        {desktopCalendarMode === 'grid' && (
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const daySessions = filteredSessions.filter((s) => s.date === day.dateStr);

              return (
                <div
                  key={day.dateStr}
                  className={`flex flex-col rounded-2xl border transition-all min-h-[460px] min-w-0 overflow-hidden ${
                    day.isToday
                      ? 'bg-zinc-900/90 border-emerald-500/40 shadow-lg'
                      : 'bg-zinc-900/60 backdrop-blur-md border-white/[0.06]'
                  }`}
                >
                  {/* Day Header */}
                  <div
                    onClick={() => {
                      if (daySessions.length > 0) {
                        setSelectedDayDetail({
                          dateStr: day.dateStr,
                          dayName: day.dayName,
                          dayNumber: day.dayNumber,
                        });
                      }
                    }}
                    className={`p-3.5 border-b flex items-center justify-between min-w-0 ${
                      daySessions.length > 0 ? 'cursor-pointer hover:bg-white/[0.04]' : ''
                    } ${
                      day.isToday
                        ? 'border-emerald-500/20 bg-emerald-500/[0.08]'
                        : 'border-white/[0.06] bg-zinc-900/80'
                    }`}
                  >
                    <div className="min-w-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider block text-zinc-400 truncate">
                        {day.dayName}
                      </span>
                      <span className={`text-base font-bold ${day.isToday ? 'text-emerald-400' : 'text-zinc-100'}`}>
                        Dia {day.dayNumber}
                      </span>
                    </div>
                    {day.isToday && (
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        Hoje
                      </span>
                    )}
                  </div>

                  {/* Sessions List inside Day */}
                  <div className="p-2.5 space-y-2 flex-1 overflow-y-auto min-w-0">
                    {daySessions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-3 text-xs text-zinc-500 italic space-y-2">
                        <span>Sem treinos</span>
                        <button
                          onClick={() => handleOpenAddModal(day.dateStr)}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium not-italic bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 transition-colors"
                        >
                          + Agendar
                        </button>
                      </div>
                    ) : (
                      daySessions.map((session) => {
                        const isDone = session.status === 'REALIZADA';
                        const isCancelled = session.status === 'CANCELADA';

                        return (
                          <div
                            key={session.id}
                            onClick={() => setSelectedSessionDetail(session)}
                            className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer shadow-sm hover:scale-[1.01] active:scale-[0.99] min-w-0 ${
                              isDone
                                ? 'bg-emerald-500/[0.08] border-emerald-500/20 hover:border-emerald-500/40 text-zinc-200'
                                : isCancelled
                                ? 'bg-rose-500/[0.05] border-rose-500/20 opacity-60 text-zinc-400'
                                : 'bg-zinc-900 border-white/[0.08] hover:border-emerald-500/30 text-zinc-200'
                            }`}
                            title="Clique para ver todos os detalhes e ações"
                          >
                            <div className="flex items-center justify-between font-medium mb-1 min-w-0 gap-1">
                              <span className="truncate pr-1 text-zinc-100 font-bold text-[11px]">
                                {session.studentName}
                              </span>
                              <span className="font-mono text-[10px] text-emerald-400 font-bold shrink-0">
                                {session.time}
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-white/[0.04] text-[10px]">
                              <span className="text-zinc-500 truncate max-w-[90px]">
                                {session.location.split('-')[0]}
                              </span>
                              <Badge
                                variant={isDone ? 'success' : isCancelled ? 'danger' : 'info'}
                                size="sm"
                              >
                                {session.status}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Botão rápido para adicionar treino neste dia */}
                  <div className="p-2 border-t border-white/[0.04]">
                    <button
                      onClick={() => handleOpenAddModal(day.dateStr)}
                      className="w-full py-1.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-300 text-[11px] font-medium transition-colors flex items-center justify-center gap-1 border border-white/[0.04]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Agendar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. VISUALIZAÇÃO MOBILE (APK)                             */}
      {/* Preservada exatamente como está atualmente                */}
      {/* ======================================================== */}
      <div
        className={`${
          deviceView === 'mobile'
            ? 'block'
            : deviceView === 'desktop'
            ? 'hidden'
            : 'block lg:hidden'
        } space-y-4`}
      >
        {/* Banner Identificador da Versão Mobile APK */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold">Versão Mobile (APK)</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {formatWeekRange()}
          </span>
        </div>

        {/* Grade Semanal Interativa (Mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {weekDays.map((day) => {
            const daySessions = filteredSessions.filter((s) => s.date === day.dateStr);

            return (
              <div
                key={day.dateStr}
                className={`flex flex-col rounded-2xl border transition-all ${
                  day.isToday
                    ? 'bg-zinc-900/90 border-emerald-500/40 shadow-sm'
                    : 'bg-zinc-900/60 backdrop-blur-md border-white/[0.06]'
                }`}
              >
                {/* Day Header */}
                <div
                  className={`p-3 border-b flex items-center justify-between ${
                    day.isToday
                      ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
                      : 'border-white/[0.06] bg-zinc-900/80'
                  }`}
                >
                  <div>
                    <span className="text-[11px] font-medium uppercase tracking-wider block text-zinc-400">
                      {day.dayName}
                    </span>
                    <span className={`text-sm font-semibold ${day.isToday ? 'text-emerald-400' : 'text-zinc-100'}`}>
                      Dia {day.dayNumber}
                    </span>
                  </div>
                  {day.isToday && (
                    <span className="text-[9px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Hoje
                    </span>
                  )}
                </div>

                {/* Sessions List inside Day */}
                <div className="p-2.5 space-y-2.5 flex-1 min-h-[140px]">
                  {daySessions.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-zinc-500 italic">
                      Sem treinos
                    </div>
                  ) : (
                    daySessions.map((session) => {
                      const isDone = session.status === 'REALIZADA';
                      const isCancelled = session.status === 'CANCELADA';

                      return (
                        <div
                          key={session.id}
                          className={`p-2.5 rounded-xl border text-xs transition-all ${
                            isDone
                              ? 'bg-emerald-500/[0.05] border-emerald-500/20 text-zinc-200'
                              : isCancelled
                              ? 'bg-rose-500/[0.05] border-rose-500/20 opacity-60 text-zinc-400'
                              : 'bg-zinc-900/90 border-white/[0.06] hover:border-white/10 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center justify-between font-medium mb-1">
                            <span className="truncate pr-1 text-zinc-100 font-medium">{session.studentName}</span>
                            <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                              {session.time}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-zinc-400 mb-1.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0 text-zinc-500" />
                            <span className="truncate">{session.location.split('-')[0]}</span>
                          </div>

                          {session.routineName && (
                            <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-2 truncate">
                              <Dumbbell className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{session.routineName}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06]">
                            <Badge
                              variant={isDone ? 'success' : isCancelled ? 'danger' : 'info'}
                              size="sm"
                            >
                              {session.status}
                            </Badge>

                            <div className="flex items-center gap-1">
                              {!isDone && (
                                <button
                                  onClick={() => updateSessionStatus(session.id, 'REALIZADA')}
                                  title="Marcar como realizada"
                                  className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {!isCancelled && (
                                <button
                                  onClick={() => updateSessionStatus(session.id, 'CANCELADA')}
                                  title="Cancelar sessão"
                                  className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL: DETALHES COMPLETOS DA SESSÃO AO CLICAR            */}
      {/* ======================================================== */}
      {selectedSessionDetail && (
        <Modal
          isOpen={!!selectedSessionDetail}
          onClose={() => setSelectedSessionDetail(null)}
          title="Detalhes do Agendamento"
          subtitle={`${selectedSessionDetail.studentName} • ${selectedSessionDetail.time}`}
        >
          <div className="space-y-4 text-sm">
            {/* Header com Aluno e Status */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-900 border border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-base">
                  {selectedSessionDetail.studentName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-base text-zinc-100">{selectedSessionDetail.studentName}</h4>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-mono text-emerald-400 font-semibold">{selectedSessionDetail.time}</span>
                    <span>({selectedSessionDetail.durationMinutes} minutos)</span>
                  </p>
                </div>
              </div>
              <Badge
                variant={
                  selectedSessionDetail.status === 'REALIZADA'
                    ? 'success'
                    : selectedSessionDetail.status === 'CANCELADA'
                    ? 'danger'
                    : 'info'
                }
                size="md"
              >
                {selectedSessionDetail.status}
              </Badge>
            </div>

            {/* Informações de Data e Local */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Data do Treino
                </span>
                <p className="text-zinc-200 font-medium flex items-center gap-2 text-xs">
                  <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {new Date(selectedSessionDetail.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Local / Academia
                </span>
                <p className="text-zinc-200 font-medium flex items-center gap-2 text-xs truncate">
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="truncate">{selectedSessionDetail.location}</span>
                </p>
              </div>
            </div>

            {/* Ficha de Treino Prevista */}
            {selectedSessionDetail.routineName && (
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] space-y-1">
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                  Ficha de Treino Prevista
                </span>
                <p className="text-zinc-200 font-medium flex items-center gap-2 text-xs">
                  <Dumbbell className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{selectedSessionDetail.routineName}</span>
                </p>
              </div>
            )}

            {/* Ações de Conclusão / Cancelamento / Status */}
            <div className="pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {selectedSessionDetail.status !== 'REALIZADA' && (
                  <button
                    onClick={() => {
                      updateSessionStatus(selectedSessionDetail.id, 'REALIZADA');
                      setSelectedSessionDetail((prev) => prev ? { ...prev, status: 'REALIZADA' } : null);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Concluir Treino</span>
                  </button>
                )}

                {selectedSessionDetail.status !== 'CANCELADA' && (
                  <button
                    onClick={() => {
                      updateSessionStatus(selectedSessionDetail.id, 'CANCELADA');
                      setSelectedSessionDetail((prev) => prev ? { ...prev, status: 'CANCELADA' } : null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-semibold text-xs transition-colors flex items-center gap-1.5 border border-rose-500/30"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                )}

                {selectedSessionDetail.status !== 'AGENDADA' && (
                  <button
                    onClick={() => {
                      updateSessionStatus(selectedSessionDetail.id, 'AGENDADA');
                      setSelectedSessionDetail((prev) => prev ? { ...prev, status: 'AGENDADA' } : null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
                  >
                    Reabrir como Agendada
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedSessionDetail(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors ml-auto"
              >
                Fechar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL: AGENDA COMPLETA DO DIA (AO CLICAR NO DIA)        */}
      {/* ======================================================== */}
      {selectedDayDetail && (
        <Modal
          isOpen={!!selectedDayDetail}
          onClose={() => setSelectedDayDetail(null)}
          title={`Agenda de ${selectedDayDetail.dayName} (Dia ${selectedDayDetail.dayNumber})`}
          subtitle="Sessões de treino agendadas para este dia"
        >
          <div className="space-y-4 text-sm">
            {(() => {
              const daySessions = filteredSessions.filter((s) => s.date === selectedDayDetail.dateStr);

              if (daySessions.length === 0) {
                return (
                  <div className="text-center py-8 text-zinc-500 text-xs space-y-3">
                    <p>Nenhum treino agendado para este dia.</p>
                    <button
                      onClick={() => {
                        const d = selectedDayDetail.dateStr;
                        setSelectedDayDetail(null);
                        handleOpenAddModal(d);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors"
                    >
                      + Agendar Sessão Neste Dia
                    </button>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {daySessions.map((s) => {
                    const isDone = s.status === 'REALIZADA';
                    const isCancelled = s.status === 'CANCELADA';

                    return (
                      <div
                        key={s.id}
                        className="p-4 rounded-2xl bg-zinc-900 border border-white/[0.08] flex items-center justify-between gap-3"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100 text-sm">{s.studentName}</span>
                            <span className="font-mono text-xs text-emerald-400 font-bold">
                              {s.time}
                            </span>
                            <Badge
                              variant={isDone ? 'success' : isCancelled ? 'danger' : 'info'}
                              size="sm"
                            >
                              {s.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-zinc-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-zinc-500 shrink-0" />
                            <span className="truncate">{s.location}</span>
                          </p>
                          {s.routineName && (
                            <p className="text-xs text-zinc-300 flex items-center gap-1 truncate">
                              <Dumbbell className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="truncate">{s.routineName}</span>
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedDayDetail(null);
                              setSelectedSessionDetail(s);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                    <button
                      onClick={() => {
                        const d = selectedDayDetail.dateStr;
                        setSelectedDayDetail(null);
                        handleOpenAddModal(d);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agendar Mais Um Treino</span>
                    </button>
                    <button
                      onClick={() => setSelectedDayDetail(null)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium text-xs transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL: AGENDAR NOVA SESSÃO                               */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Agendar Nova Sessão de Treino"
        subtitle="Defina o aluno, dia, horário e o local do treino"
      >
        <form onSubmit={handleCreateSession} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Aluno
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              required
            >
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.primaryGoal || 'Treino'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Horário
              </label>
              <input
                type="time"
                value={sessionTime}
                onChange={(e) => setSessionTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Duração (minutos)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value={45}>45 minutos</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={90}>90 minutos (1h 30m)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Ficha de Treino Prevista
              </label>
              <select
                value={selectedRoutineId}
                onChange={(e) => setSelectedRoutineId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Selecione o treino...</option>
                {selectedStudentObj?.workouts?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Local / Academia
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Smart Fit Paulista, Bio Ritmo Jardins, Condomínio..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-lg shadow-emerald-500/20"
            >
              Confirmar Agendamento
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
