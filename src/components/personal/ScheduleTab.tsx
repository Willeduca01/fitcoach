import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { SessionSchedule, SessionStatus } from '../../types';
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
  Filter
} from 'lucide-react';

export const ScheduleTab: React.FC = () => {
  const { sessions, students, addSession, updateSessionStatus } = useAppData();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | SessionStatus>('ALL');

  // Formulário para nova sessão
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [sessionTime, setSessionTime] = useState('08:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [location, setLocation] = useState('Smart Fit - Unidade Paulista');
  const [selectedRoutineId, setSelectedRoutineId] = useState('');

  // Obter dias da semana corrente (Segunda a Domingo)
  const getWeekDates = () => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 é domingo, 1 é segunda
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      week.push({
        dateStr,
        dayName: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'][i],
        dayNumber: d.getDate(),
        isToday: dateStr === new Date().toISOString().split('T')[0],
      });
    }
    return week;
  };

  const weekDays = getWeekDates();

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) return;

    const routine = student.workouts.find((w) => w.id === selectedRoutineId);

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

  const filteredSessions = sessions.filter((s) => {
    if (filterStatus === 'ALL') return true;
    return s.status === filterStatus;
  });

  const selectedStudentObj = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-emerald-400" />
            Agenda Semanal & Controle de Sessões
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão de horários de treinos presenciais, academias e status das sessões.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
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
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-lg shadow-emerald-500/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Agendar Sessão</span>
          </button>
        </div>
      </div>

      {/* Grade Semanal Interativa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
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
              <div className="p-2.5 space-y-2.5 flex-1 min-h-[160px]">
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

      {/* Modal: Agendar Nova Sessão */}
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
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.primaryGoal})
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
                {selectedStudentObj?.workouts.map((w) => (
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
