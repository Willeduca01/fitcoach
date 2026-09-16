import React, { useState } from 'react';
import { Student, MeasurementRecord } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { Modal } from '../common/Modal';
import { Activity, Plus, TrendingDown, TrendingUp, Calendar, ArrowRight } from 'lucide-react';

interface PhysicalAssessmentProps {
  student: Student;
}

export const PhysicalAssessment: React.FC<PhysicalAssessmentProps> = ({ student }) => {
  const { addMeasurement } = useAppData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [weightKg, setWeightKg] = useState('80.0');
  const [heightCm, setHeightCm] = useState('175');
  const [bodyFat, setBodyFat] = useState('15.0');
  const [chestCm, setChestCm] = useState('100');
  const [armsCm, setArmsCm] = useState('38');
  const [waistCm, setWaistCm] = useState('82');
  const [hipsCm, setHipsCm] = useState('100');
  const [thighsCm, setThighsCm] = useState('60');

  const measurements = student.measurements || [];
  const latest = measurements[measurements.length - 1];
  const previous = measurements.length > 1 ? measurements[measurements.length - 2] : undefined;

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();

    addMeasurement(student.id, {
      date,
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      bodyFatPercentage: bodyFat ? Number(bodyFat) : undefined,
      chestCm: chestCm ? Number(chestCm) : undefined,
      armsCm: armsCm ? Number(armsCm) : undefined,
      waistCm: waistCm ? Number(waistCm) : undefined,
      hipsCm: hipsCm ? Number(hipsCm) : undefined,
      thighsCm: thighsCm ? Number(thighsCm) : undefined,
    });

    setIsAddModalOpen(false);
  };

  const getDelta = (curr?: number, prev?: number, unit = 'cm', inversePositive = false) => {
    if (curr === undefined || prev === undefined) return null;
    const diff = Number((curr - prev).toFixed(1));
    if (diff === 0) return <span className="text-slate-500 text-xs">0.0 {unit}</span>;

    const isGood = inversePositive ? diff < 0 : diff > 0;

    return (
      <span className={`text-xs font-semibold flex items-center gap-0.5 ${isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
        {diff > 0 ? `+${diff}` : diff} {unit}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Evolução Antropométrica & Medidas Corporais
          </h3>
          <p className="text-xs text-slate-400">
            Acompanhamento periódico de peso, composição corporal e circunferências.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-md shadow-emerald-500/20"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Registrar Avaliação</span>
        </button>
      </div>

      {/* Latest Comparative Cards */}
      {latest ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[11px] text-zinc-400 block mb-1">Peso Corporal</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-zinc-100">{latest.weightKg} kg</span>
              {getDelta(latest.weightKg, previous?.weightKg, 'kg', true)}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1 font-mono">{latest.date}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[11px] text-zinc-400 block mb-1">% Gordura Estimado</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-emerald-400">
                {latest.bodyFatPercentage ? `${latest.bodyFatPercentage}%` : 'N/A'}
              </span>
              {getDelta(latest.bodyFatPercentage, previous?.bodyFatPercentage, '%', true)}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">Bioimpedância / Dobras</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[11px] text-zinc-400 block mb-1">Cintura</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-zinc-100">{latest.waistCm || '--'} cm</span>
              {getDelta(latest.waistCm, previous?.waistCm, 'cm', true)}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">Circunferência umbilical</span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/[0.06]">
            <span className="text-[11px] text-zinc-400 block mb-1">Braço (Contração)</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-semibold text-zinc-100">{latest.armsCm || '--'} cm</span>
              {getDelta(latest.armsCm, previous?.armsCm, 'cm', false)}
            </div>
            <span className="text-[10px] text-zinc-500 block mt-1">Hipertrofia de braço</span>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center rounded-xl bg-zinc-900/40 border border-dashed border-white/[0.08] text-zinc-500 text-sm">
          Nenhuma avaliação registrada ainda. Cadastre a primeira avaliação física do aluno.
        </div>
      )}

      {/* History Table */}
      {measurements.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-zinc-950/60">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
              <tr>
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Peso</th>
                <th className="py-3 px-4">% Gordura</th>
                <th className="py-3 px-4">Tórax</th>
                <th className="py-3 px-4">Braço</th>
                <th className="py-3 px-4">Cintura</th>
                <th className="py-3 px-4">Quadril</th>
                <th className="py-3 px-4">Coxa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {measurements.slice().reverse().map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 text-white font-sans font-semibold">{m.date}</td>
                  <td className="py-3 px-4 text-emerald-400 font-bold">{m.weightKg} kg</td>
                  <td className="py-3 px-4">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : '--'}</td>
                  <td className="py-3 px-4">{m.chestCm ? `${m.chestCm} cm` : '--'}</td>
                  <td className="py-3 px-4">{m.armsCm ? `${m.armsCm} cm` : '--'}</td>
                  <td className="py-3 px-4">{m.waistCm ? `${m.waistCm} cm` : '--'}</td>
                  <td className="py-3 px-4">{m.hipsCm ? `${m.hipsCm} cm` : '--'}</td>
                  <td className="py-3 px-4">{m.thighsCm ? `${m.thighsCm} cm` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Nova Avaliação */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Registrar Nova Avaliação Física"
        subtitle={`Aluno: ${student.name}`}
      >
        <form onSubmit={handleAddMeasurement} className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Data da Aferição
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                % Gordura
              </label>
              <input
                type="number"
                step="0.1"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Circunferências (cm)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tórax</label>
                <input
                  type="number"
                  step="0.5"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Braço</label>
                <input
                  type="number"
                  step="0.5"
                  value={armsCm}
                  onChange={(e) => setArmsCm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cintura</label>
                <input
                  type="number"
                  step="0.5"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Quadril</label>
                <input
                  type="number"
                  step="0.5"
                  value={hipsCm}
                  onChange={(e) => setHipsCm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Coxa</label>
                <input
                  type="number"
                  step="0.5"
                  value={thighsCm}
                  onChange={(e) => setThighsCm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold hover:bg-emerald-400"
            >
              Salvar Aferição
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
