import React, { useState } from 'react';
import { Student, WorkoutRoutine, Exercise } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { Plus, Trash2, Dumbbell, Sparkles, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../common/Modal';

interface WorkoutBuilderProps {
  student: Student;
}

export const WorkoutBuilder: React.FC<WorkoutBuilderProps> = ({ student }) => {
  const { addWorkoutRoutine, updateWorkoutRoutine, deleteWorkoutRoutine } = useAppData();
  const [activeRoutineIndex, setActiveRoutineIndex] = useState(0);

  // Modal para criar nova rotina
  const [isNewRoutineModalOpen, setIsNewRoutineModalOpen] = useState(false);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [newRoutineFocus, setNewRoutineFocus] = useState('');

  // Modal para adicionar exercício à rotina ativa
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseMuscleGroup, setExerciseMuscleGroup] = useState('Peitoral');
  const [exerciseSets, setExerciseSets] = useState(4);
  const [exerciseReps, setExerciseReps] = useState('10 a 12');
  const [exerciseLoad, setExerciseLoad] = useState('20 kg');
  const [exerciseNotes, setExerciseNotes] = useState('');

  const currentRoutine = student.workouts[activeRoutineIndex] || student.workouts[0];

  const handleCreateRoutine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoutineName) return;

    addWorkoutRoutine(student.id, {
      name: newRoutineName,
      focus: newRoutineFocus || 'Geral',
      exercises: []
    });

    setNewRoutineName('');
    setNewRoutineFocus('');
    setIsNewRoutineModalOpen(false);
    setActiveRoutineIndex(student.workouts.length);
  };

  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseName || !currentRoutine) return;

    const newExercise: Exercise = {
      id: `ex-${Date.now()}`,
      name: exerciseName,
      muscleGroup: exerciseMuscleGroup,
      sets: Number(exerciseSets),
      reps: exerciseReps,
      load: exerciseLoad,
      notes: exerciseNotes || undefined,
      completed: false
    };

    const updatedRoutine: WorkoutRoutine = {
      ...currentRoutine,
      exercises: [...currentRoutine.exercises, newExercise]
    };

    updateWorkoutRoutine(student.id, updatedRoutine);

    // Reset form
    setExerciseName('');
    setExerciseSets(4);
    setExerciseReps('10 a 12');
    setExerciseLoad('');
    setExerciseNotes('');
    setIsAddExerciseModalOpen(false);
  };

  const handleRemoveExercise = (exerciseId: string) => {
    if (!currentRoutine) return;
    const updatedRoutine: WorkoutRoutine = {
      ...currentRoutine,
      exercises: currentRoutine.exercises.filter((ex) => ex.id !== exerciseId)
    };
    updateWorkoutRoutine(student.id, updatedRoutine);
  };

  const handleDeleteRoutine = (routineId: string) => {
    if (student.workouts.length <= 1) {
      alert('O aluno deve possuir ao menos uma rotina de treino cadastrada.');
      return;
    }
    deleteWorkoutRoutine(student.id, routineId);
    setActiveRoutineIndex(0);
  };

  return (
    <div className="space-y-5">
      {/* Sub-header with routine tabs and create button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {student.workouts.map((routine, idx) => (
            <button
              key={routine.id}
              onClick={() => setActiveRoutineIndex(idx)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeRoutineIndex === idx
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>{routine.name.split('-')[0].trim()}</span>
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsNewRoutineModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          <span>Nova Rotina</span>
        </button>
      </div>

      {currentRoutine ? (
        <div className="space-y-4">
          {/* Active Routine Info Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] gap-3">
            <div>
              <h3 className="font-semibold text-zinc-100 text-base flex items-center gap-2">
                {currentRoutine.name}
              </h3>
              <p className="text-xs text-emerald-400 mt-0.5">
                Foco: <span className="text-zinc-300">{currentRoutine.focus}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddExerciseModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Adicionar Exercício</span>
              </button>

              <button
                onClick={() => handleDeleteRoutine(currentRoutine.id)}
                title="Excluir esta rotina"
                className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Exercises List */}
          {currentRoutine.exercises.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-dashed border-white/[0.08] text-zinc-500 text-sm">
              Nenhum exercício cadastrado nesta rotina. Clique em "Adicionar Exercício" acima.
            </div>
          ) : (
            <div className="space-y-2.5">
              {currentRoutine.exercises.map((exercise, index) => (
                <div
                  key={exercise.id}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-white/[0.06] hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 border border-white/[0.06]">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-zinc-100 text-sm">{exercise.name}</h4>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06]">
                          {exercise.muscleGroup}
                        </span>
                      </div>
                      {exercise.notes && (
                        <p className="text-xs text-amber-400/90 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          <span>{exercise.notes}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 pl-9 sm:pl-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="flex items-center gap-3 text-xs">
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Séries</span>
                        <span className="font-bold text-white">{exercise.sets}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Reps</span>
                        <span className="font-bold text-emerald-400">{exercise.reps}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 text-[10px] block">Carga</span>
                        <span className="font-bold text-sky-400">{exercise.load}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveExercise(exercise.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remover exercício"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-slate-500 text-sm">
          Selecione ou crie uma rotina para começar.
        </div>
      )}

      {/* Modal: Nova Rotina */}
      <Modal
        isOpen={isNewRoutineModalOpen}
        onClose={() => setIsNewRoutineModalOpen(false)}
        title="Criar Nova Rotina de Treino"
        subtitle={`Adicionar divisão para ${student.name}`}
      >
        <form onSubmit={handleCreateRoutine} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Nome da Rotina
            </label>
            <input
              type="text"
              value={newRoutineName}
              onChange={(e) => setNewRoutineName(e.target.value)}
              placeholder="Ex: Treino D - Ombros e Abdômen"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Foco Principal
            </label>
            <input
              type="text"
              value={newRoutineFocus}
              onChange={(e) => setNewRoutineFocus(e.target.value)}
              placeholder="Ex: Hipertrofia de Deltoides & Core"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewRoutineModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
            >
              Salvar Rotina
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adicionar Exercício */}
      <Modal
        isOpen={isAddExerciseModalOpen}
        onClose={() => setIsAddExerciseModalOpen(false)}
        title="Adicionar Exercício"
        subtitle={`Rotina: ${currentRoutine?.name}`}
      >
        <form onSubmit={handleAddExercise} className="space-y-4 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Nome do Exercício
              </label>
              <input
                type="text"
                value={exerciseName}
                onChange={(e) => setExerciseName(e.target.value)}
                placeholder="Ex: Supino Inclinado com Halteres"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Grupo Muscular
              </label>
              <select
                value={exerciseMuscleGroup}
                onChange={(e) => setExerciseMuscleGroup(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Peitoral">Peitoral</option>
                <option value="Costas / Dorsais">Costas / Dorsais</option>
                <option value="Quadríceps">Quadríceps</option>
                <option value="Posterior de Coxa">Posterior de Coxa</option>
                <option value="Glúteos">Glúteos</option>
                <option value="Ombros / Deltoides">Ombros / Deltoides</option>
                <option value="Bíceps">Bíceps</option>
                <option value="Tríceps">Tríceps</option>
                <option value="Panturrilhas">Panturrilhas</option>
                <option value="Abdômen / Core">Abdômen / Core</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Séries
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={exerciseSets}
                onChange={(e) => setExerciseSets(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Repetições
              </label>
              <input
                type="text"
                value={exerciseReps}
                onChange={(e) => setExerciseReps(e.target.value)}
                placeholder="Ex: 8 a 10"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Carga
              </label>
              <input
                type="text"
                value={exerciseLoad}
                onChange={(e) => setExerciseLoad(e.target.value)}
                placeholder="Ex: 24 kg"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Observações Técnicas / Dicas de Execução
            </label>
            <textarea
              value={exerciseNotes}
              onChange={(e) => setExerciseNotes(e.target.value)}
              placeholder="Ex: Escápulas travadas, descida lenta em 3s, cadência 3-0-1..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddExerciseModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
            >
              Adicionar à Rotina
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
