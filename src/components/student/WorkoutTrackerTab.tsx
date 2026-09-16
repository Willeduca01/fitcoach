import React, { useState } from 'react';
import { Student } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import confetti from 'canvas-confetti';
import {
  Dumbbell,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trophy,
  Check
} from 'lucide-react';

interface WorkoutTrackerTabProps {
  student: Student;
}

export const WorkoutTrackerTab: React.FC<WorkoutTrackerTabProps> = ({ student }) => {
  const { toggleExerciseCompletion } = useAppData();
  const [activeRoutineIndex, setActiveRoutineIndex] = useState(0);

  const workouts = student.workouts || [];
  const currentRoutine = workouts[activeRoutineIndex] || workouts[0];

  if (!currentRoutine) {
    return (
      <div className="p-8 text-center rounded-3xl bg-zinc-900/60 border border-white/[0.06] text-zinc-400 m-6">
        Nenhum treino disponível no momento. O seu treinador irá cadastrar sua ficha em breve.
      </div>
    );
  }

  const exercises = currentRoutine.exercises || [];
  const completedCount = exercises.filter((e) => e.completed).length;
  const progressPercent = exercises.length > 0 ? Math.round((completedCount / exercises.length) * 100) : 0;
  const isAllCompleted = exercises.length > 0 && completedCount === exercises.length;

  const handleToggle = (exerciseId: string) => {
    const exercise = exercises.find((e) => e.id === exerciseId);
    const willBeCompleted = !exercise?.completed;

    toggleExerciseCompletion(student.id, currentRoutine.id, exerciseId);

    // Se estiver marcando e completar todos, dispara confetti!
    if (willBeCompleted && completedCount + 1 === exercises.length) {
      triggerConfetti();
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#34d399', '#10b981', '#a3e635'],
    });
  };

  const handleResetCurrentWorkout = () => {
    exercises.forEach((ex) => {
      if (ex.completed) {
        toggleExerciseCompletion(student.id, currentRoutine.id, ex.id);
      }
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* Routine Selector Tabs (Linear style) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {workouts.map((routine, idx) => {
          const isSelected = activeRoutineIndex === idx;
          const routineCompleted = routine.exercises.filter((e) => e.completed).length;
          const routineTotal = routine.exercises.length;

          return (
            <button
              key={routine.id}
              onClick={() => setActiveRoutineIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-medium shrink-0 transition-all ${
                isSelected
                  ? 'bg-zinc-800 text-zinc-100 border border-white/[0.12] shadow-subtle'
                  : 'bg-zinc-900/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 border border-white/[0.04]'
              }`}
            >
              <Dumbbell className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald-400' : 'text-zinc-500'}`} />
              <span>{routine.name.split('-')[0].trim()}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {routineCompleted}/{routineTotal}
              </span>
            </button>
          );
        })}
      </div>

      {/* Routine Header Banner & Progress */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
              Rotina Ativa
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100 mt-0.5">
              {currentRoutine.name}
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Foco da sessão: <span className="text-zinc-200 font-medium">{currentRoutine.focus}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {completedCount > 0 && (
              <button
                onClick={handleResetCurrentWorkout}
                title="Reiniciar checklist do treino"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-zinc-100 text-xs font-medium border border-white/[0.06] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
                <span>Reiniciar</span>
              </button>
            )}
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Progresso dos exercícios</span>
            <span className={isAllCompleted ? 'text-emerald-400 font-semibold' : 'text-zinc-300 font-mono'}>
              {completedCount} de {exercises.length} concluídos ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden border border-white/[0.04]">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Triumphant Celebration Banner when 100% */}
      {isAllCompleted && (
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-emerald-500/30 text-center space-y-2 shadow-soft-card backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
            <Trophy className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">Treino Concluído! 🏆</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            Excelente dedicação. Mais uma etapa concluída rumo ao seu objetivo.
          </p>
          <button
            onClick={triggerConfetti}
            className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.08] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Celebrar novamente</span>
          </button>
        </div>
      )}

      {/* Exercise Cards Checklist */}
      <div className="space-y-2.5">
        {exercises.map((exercise, index) => {
          const isDone = !!exercise.completed;

          return (
            <div
              key={exercise.id}
              onClick={() => handleToggle(exercise.id)}
              className={`group cursor-pointer select-none rounded-2xl p-4 border transition-all duration-200 ${
                isDone
                  ? 'bg-zinc-900/30 border-white/[0.04] text-zinc-500'
                  : 'bg-zinc-900/60 hover:bg-zinc-850/60 border-white/[0.06] hover:border-white/[0.12] text-zinc-100 shadow-soft-card'
              }`}
            >
              <div className="flex items-start gap-3.5">
                {/* Checkbox button */}
                <div
                  className={`mt-0.5 w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                    isDone
                      ? 'bg-emerald-400 text-zinc-950'
                      : 'border border-white/20 bg-zinc-800 group-hover:border-emerald-400/50'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                    <h4
                      className={`text-sm font-semibold truncate ${
                        isDone ? 'line-through text-zinc-500' : 'text-zinc-100'
                      }`}
                    >
                      {exercise.name}
                    </h4>
                    <span className="text-[10px] uppercase font-medium px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-white/[0.04]">
                      {exercise.muscleGroup}
                    </span>
                  </div>

                  {/* Target details */}
                  <div className="flex flex-wrap items-center gap-2.5 text-xs my-2 font-mono">
                    <div className="bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/[0.04]">
                      <span className="text-zinc-400 text-[10px]">Séries: </span>
                      <span className="font-semibold text-zinc-200">{exercise.sets}</span>
                    </div>

                    <div className="bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/[0.04]">
                      <span className="text-zinc-400 text-[10px]">Reps: </span>
                      <span className="font-semibold text-emerald-400">{exercise.reps}</span>
                    </div>

                    <div className="bg-zinc-800/60 px-2.5 py-1 rounded-lg border border-white/[0.04]">
                      <span className="text-zinc-400 text-[10px]">Carga: </span>
                      <span className="font-semibold text-zinc-200">{exercise.load}</span>
                    </div>
                  </div>

                  {/* Postural warnings and technical advice */}
                  {exercise.notes && (
                    <div className="mt-2.5 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold block text-[11px] text-amber-300">
                          Atenção Postural:
                        </span>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{exercise.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
