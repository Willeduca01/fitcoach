import React from 'react';
import { Student } from '../../types';
import {
  Activity,
  Calendar,
  Sparkles,
  TrendingDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

interface EvolutionTabProps {
  student: Student;
}

export const EvolutionTab: React.FC<EvolutionTabProps> = ({ student }) => {
  const measurements = student.measurements || [];
  const latest = measurements[measurements.length - 1];
  const first = measurements[0];

  // Formatar dados para o gráfico de peso
  const chartData = measurements.map((m) => ({
    date: m.date.slice(5), // MM-DD
    peso: m.weightKg,
    gordura: m.bodyFatPercentage,
  }));

  const totalWeightDiff = latest && first ? Number((latest.weightKg - first.weightKg).toFixed(1)) : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          Evolução Física & Antropometria
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Histórico das pesagens e circunferências aferidas nas reavaliações.
        </p>
      </div>

      {/* Próxima Reavaliação Card */}
      {student.nextAssessmentDate && (
        <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between gap-4 shadow-soft-card backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 shrink-0 border border-white/[0.04]">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-400 block">
                Próxima Reavaliação Agendada
              </span>
              <h4 className="text-sm font-semibold text-zinc-100">
                {new Date(student.nextAssessmentDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </h4>
            </div>
          </div>
          <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 border border-white/[0.06]">
            Ciclo de 45 dias
          </span>
        </div>
      )}

      {/* Summary KPI Cards */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              Peso Atual
            </span>
            <div className="text-2xl font-semibold tracking-tight text-zinc-100">{latest.weightKg} kg</div>
            <span className="text-[11px] text-emerald-400 block mt-1 font-medium">
              {totalWeightDiff !== 0
                ? `${totalWeightDiff > 0 ? '+' : ''}${totalWeightDiff} kg acumulados`
                : 'Primeira pesagem'}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              % Gordura
            </span>
            <div className="text-2xl font-semibold tracking-tight text-emerald-400">
              {latest.bodyFatPercentage ? `${latest.bodyFatPercentage}%` : '--'}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">Estimativa de bioimpedância</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              Cintura
            </span>
            <div className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono">
              {latest.waistCm ? `${latest.waistCm} cm` : '--'}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">Linha umbilical</span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">
              Braço Contraído
            </span>
            <div className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono">
              {latest.armsCm ? `${latest.armsCm} cm` : '--'}
            </div>
            <span className="text-[11px] text-zinc-500 block mt-1">Pico de contração</span>
          </div>
        </div>
      )}

      {/* Gráfico de Evolução de Peso */}
      {measurements.length > 1 ? (
        <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-4">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">Curva de Peso Corporal (kg)</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Progressão ao longo das avaliações físicas periódicas</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorStudentPeso2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #27272a)" strokeOpacity={0.6} />
                <XAxis dataKey="date" stroke="var(--chart-axis, #71717a)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--chart-axis, #71717a)" fontSize={11} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, rgba(24, 24, 27, 0.95))',
                    borderColor: 'var(--tooltip-border, rgba(255, 255, 255, 0.1))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--tooltip-text, #f4f4f5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  itemStyle={{ color: 'var(--tooltip-text, #f4f4f5)' }}
                  labelStyle={{ color: 'var(--tooltip-text, #f4f4f5)' }}
                  formatter={(value: any) => [`${value} kg`, 'Peso']}
                />
                <Area
                  type="monotone"
                  dataKey="peso"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorStudentPeso2)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {/* Tabela de Medidas Comparativas */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-3">
        <h3 className="text-base font-semibold text-zinc-100">Histórico Completo de Aferições</h3>

        {measurements.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6">
            Nenhuma medição cadastrada ainda.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300 font-mono">
              <thead className="bg-zinc-800/40 text-zinc-400 text-[10px] uppercase tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-4 font-sans">Data</th>
                  <th className="py-3 px-4 font-sans">Peso</th>
                  <th className="py-3 px-4 font-sans">% Gordura</th>
                  <th className="py-3 px-4 font-sans">Braço</th>
                  <th className="py-3 px-4 font-sans">Cintura</th>
                  <th className="py-3 px-4 font-sans">Coxa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {measurements.slice().reverse().map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-sans font-medium text-zinc-100">{m.date}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{m.weightKg} kg</td>
                    <td className="py-3 px-4">{m.bodyFatPercentage ? `${m.bodyFatPercentage}%` : '--'}</td>
                    <td className="py-3 px-4">{m.armsCm ? `${m.armsCm} cm` : '--'}</td>
                    <td className="py-3 px-4">{m.waistCm ? `${m.waistCm} cm` : '--'}</td>
                    <td className="py-3 px-4">{m.thighsCm ? `${m.thighsCm} cm` : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
