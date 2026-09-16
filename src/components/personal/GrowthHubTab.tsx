import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import {
  TrendingUp,
  Calculator,
  Target,
  Sparkles,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  DollarSign,
  Users,
  Clock,
  Award
} from 'lucide-react';

export const GrowthHubTab: React.FC = () => {
  const { students, invoices } = useAppData();

  // Estados da Calculadora de Metas
  const [revenueGoal, setRevenueGoal] = useState<number>(12000);
  const [averageTicket, setAverageTicket] = useState<number>(380);
  const [hoursPerSession, setHoursPerSession] = useState<number>(1);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<number>(3);

  const activeStudents = students.filter((s) => s.status === 'ATIVO');
  const currentRevenue = activeStudents.reduce((acc, s) => acc + s.monthlyFee, 0);

  // Cálculos dinâmicos
  const studentsNeeded = Math.ceil(revenueGoal / (averageTicket || 1));
  const additionalStudents = Math.max(0, studentsNeeded - activeStudents.length);
  const weeklyHoursDedicated = studentsNeeded * sessionsPerWeek * hoursPerSession;
  const progressPercent = Math.min(100, Math.round((currentRevenue / (revenueGoal || 1)) * 100));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2.5">
          <TrendingUp className="w-6 h-6 text-emerald-400" />
          Hub de Crescimento & Escala do Treinador
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Ferramentas estratégicas para precificação, retenção de alunos e metas financeiras.
        </p>
      </div>

      {/* Grid: Calculadora + Playbook de Retenção */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calculadora de Metas Financeiras (7 cols) */}
        <div className="lg:col-span-7 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-6 shadow-2xl shadow-black/40 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-zinc-100 text-base">Calculadora de Metas & Capacidade</h3>
                <p className="text-xs text-zinc-400">Simule seu faturamento e esforço semanal</p>
              </div>
            </div>
            <span className="text-xs text-emerald-300 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Interativo
            </span>
          </div>

          {/* Sliders / Inputs */}
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between font-medium text-zinc-300 mb-1.5">
                <span>Meta de Receita Mensal Desejada:</span>
                <span className="text-emerald-400 font-semibold text-sm">
                  R$ {revenueGoal.toLocaleString('pt-BR')},00
                </span>
              </div>
              <input
                type="range"
                min="3000"
                max="30000"
                step="500"
                value={revenueGoal}
                onChange={(e) => setRevenueGoal(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>R$ 3.000</span>
                <span>R$ 15.000</span>
                <span>R$ 30.000+</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between font-medium text-zinc-300 mb-1.5">
                <span>Ticket Médio Cobrado por Aluno:</span>
                <span className="text-zinc-100 font-semibold text-sm">
                  R$ {averageTicket.toLocaleString('pt-BR')},00 / mês
                </span>
              </div>
              <input
                type="range"
                min="200"
                max="1000"
                step="20"
                value={averageTicket}
                onChange={(e) => setAverageTicket(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                <span>R$ 200 (Consultoria)</span>
                <span>R$ 500 (Híbrido)</span>
                <span>R$ 1.000 (Presencial VIP)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Sessões Presenciais / Semana por Aluno
                </label>
                <select
                  value={sessionsPerWeek}
                  onChange={(e) => setSessionsPerWeek(Number(e.target.value))}
                  className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  <option value={1}>1x por semana (Consultoria Híbrida)</option>
                  <option value={2}>2x por semana</option>
                  <option value={3}>3x por semana (Padrão)</option>
                  <option value={4}>4x por semana</option>
                  <option value={5}>5x por semana (Intensivo)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-medium mb-1">
                  Duração da Sessão
                </label>
                <select
                  value={hoursPerSession}
                  onChange={(e) => setHoursPerSession(Number(e.target.value))}
                  className="w-full bg-zinc-950/60 border border-white/[0.08] rounded-xl px-3 py-2 text-zinc-200 text-xs focus:outline-none focus:border-emerald-500/50"
                >
                  <option value={0.75}>45 minutos</option>
                  <option value={1}>60 minutos (1 hora)</option>
                  <option value={1.5}>90 minutos (1h 30m)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary Box */}
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Progresso atual rumo à meta:</span>
              <span className="font-semibold text-zinc-100">{progressPercent}%</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 block uppercase font-medium">Alunos Necessários</span>
                <span className="text-xl font-semibold text-emerald-400 font-mono">{studentsNeeded}</span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">
                  Faltam {additionalStudents}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 block uppercase font-medium">Carga Semanal</span>
                <span className="text-xl font-semibold text-zinc-100 font-mono">
                  {Math.round(weeklyHoursDedicated)}h
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">horas em aula</span>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-white/[0.06]">
                <span className="text-[10px] text-zinc-400 block uppercase font-medium">Valor Hora Aprox.</span>
                <span className="text-xl font-semibold text-amber-300 font-mono">
                  R$ {Math.round(revenueGoal / (Math.max(1, weeklyHoursDedicated * 4.2)))}
                </span>
                <span className="text-[9px] text-zinc-500 block mt-0.5">por hora de trabalho</span>
              </div>
            </div>
          </div>
        </div>

        {/* Playbook de Estratégias & Retenção (5 cols) */}
        <div className="lg:col-span-5 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-6 shadow-2xl shadow-black/40 space-y-4">
          <div className="flex items-center gap-2.5 pb-4 border-b border-white/[0.06]">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-100 text-base">Playbook de Retenção & Upsell</h3>
              <p className="text-xs text-zinc-400">Boas práticas comprovadas no mercado fitness</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                1. Oferta de Consultoria Híbrida
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Alunos com restrição de orçamento podem treinar presencial 1x por semana para correção postural e seguir os outros treinos pelo Portal do Aluno. Isso multiplica sua carteira sem lotar a agenda.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1">
                <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                2. Reavaliação Física a cada 45 dias
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Apresentar a evolução de medidas e peso com gráficos visuais aumenta a fidelidade do aluno em mais de 70%, reduzindo cancelamentos por desmotivação.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-amber-300 shrink-0" />
                3. Incentivo de Streak & Gamificação
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Parabenize o aluno quando ele atingir 10 ou 20 dias seguidos de treinos registrados. O reforço positivo gera senso de conquista imediato.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] hover:border-white/15 transition-colors">
              <h4 className="font-semibold text-zinc-100 flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                4. Planos Trimestrais com Desconto
              </h4>
              <p className="text-zinc-400 text-[11px] leading-relaxed">
                Substitua contratos mensais por planos de 3 ou 6 meses com pagamento programado. Isso estabiliza seu fluxo de caixa e reduz a evasão de início de ano.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
