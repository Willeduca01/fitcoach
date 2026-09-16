import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Student } from '../../types';
import { Badge } from '../common/Badge';
import { StatCard } from '../common/StatCard';
import {
  Flame,
  Calendar,
  Clock,
  MapPin,
  Dumbbell,
  ArrowRight,
  Sparkles,
  CreditCard,
  Activity,
  MessageSquare,
  QrCode,
  Copy,
  Check,
  TrendingDown,
  ChevronRight,
  Quote,
  CheckCircle2
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
import { TODAY_STR } from '../../data/mockData';

interface StudentHomeTabProps {
  student: Student;
  onNavigateTab: (tab: 'workout' | 'evolution' | 'payment' | 'contact') => void;
}

export const StudentHomeTab: React.FC<StudentHomeTabProps> = ({
  student,
  onNavigateTab,
}) => {
  const { sessions, personal, messages } = useAppData();
  const [copiedPix, setCopiedPix] = useState(false);

  // Buscar próxima sessão deste aluno
  const studentSessions = sessions
    .filter((s) => s.studentId === student.id && s.status === 'AGENDADA')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const nextSession = studentSessions[0];
  const isSessionToday = nextSession?.date === TODAY_STR;

  // Medições e evolução
  const measurements = student.measurements || [];
  const latestMeasurement = measurements[measurements.length - 1];
  const firstMeasurement = measurements[0];
  const totalWeightDiff =
    latestMeasurement && firstMeasurement
      ? Number((latestMeasurement.weightKg - firstMeasurement.weightKg).toFixed(1))
      : 0;

  // Sparkline data (apenas valores numéricos)
  const weightSparkline = measurements.map((m) => m.weightKg);
  const fatSparkline = measurements
    .filter((m) => m.bodyFatPercentage !== undefined)
    .map((m) => m.bodyFatPercentage as number);

  // Dados formatados para o gráfico Recharts
  const chartData = measurements.map((m) => ({
    date: m.date.slice(5), // MM-DD
    peso: m.weightKg,
    gordura: m.bodyFatPercentage,
  }));

  // Rotina de hoje ou primeira rotina
  const activeWorkout = student.workouts[0];
  const totalExercises = activeWorkout ? activeWorkout.exercises.length : 0;
  const completedExercises = activeWorkout
    ? activeWorkout.exercises.filter((e) => e.completed).length
    : 0;
  const workoutProgress =
    totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0;

  // Mensagens do Coach
  const studentMessages = messages.filter((m) => m.studentId === student.id);
  const lastCoachMessage = studentMessages
    .filter((m) => m.senderRole === 'PERSONAL')
    .slice(-1)[0];

  const handleCopyPix = () => {
    navigator.clipboard.writeText(personal.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // Simplificação amigável do nome do treino (menos clínico)
  const getFriendlyWorkoutName = (fullName?: string) => {
    if (!fullName) return 'Sessão com o Coach';
    if (fullName.includes('Peito')) return 'Superior: Peito & Tríceps';
    if (fullName.includes('Costas')) return 'Superior: Costas & Bíceps';
    if (fullName.includes('Inferiores') || fullName.includes('Glúteos')) return 'Inferiores: Glúteos & Pernas';
    if (fullName.includes('Full Body')) return 'Full Body Express';
    if (fullName.includes('Adaptação')) return 'Adaptação & Mobilidade';
    return fullName.split('-')[0].trim();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* 1. Header do Aluno & Boas-Vindas (Sensação de Espaço, Elegante) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-14 h-14 rounded-2xl object-cover ring-2 ring-white/10 shadow-soft-card"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-[#09090b] rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
                Olá, {student.name.split(' ')[0]}
              </h1>
              <Badge variant="neutral" size="sm">
                Plano {student.plan}
              </Badge>
            </div>

            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              <span>Meta: <strong className="text-zinc-200 font-medium">{student.primaryGoal}</strong></span>
              <span className="text-zinc-600">•</span>
              <span>Acompanhado por <strong className="text-zinc-300 font-medium">{personal.name}</strong></span>
            </p>
          </div>
        </div>

        {/* Streak de Gamificação Leve */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-900/60 border border-white/[0.06] shadow-soft-card backdrop-blur-md self-start md:self-auto">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Flame className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <span className="text-[11px] font-medium text-zinc-400 block leading-tight">Sequência Ativa</span>
            <span className="text-sm font-semibold text-zinc-100 font-mono tracking-tight">
              {student.streakDays} dias seguidos
            </span>
          </div>
        </div>
      </div>

      {/* 2. Mensagem do Treinador Real (Humanização / UX Writing Acolhedor) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900/80 via-zinc-900/60 to-zinc-900/40 border border-white/[0.06] p-4 sm:p-5 shadow-soft-card backdrop-blur-md">
        <div className="flex items-start gap-3.5">
          <img
            src={personal.avatarUrl}
            alt={personal.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-zinc-200">{personal.name}</span>
                <span className="text-[10px] text-emerald-400 font-medium px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Seu Coach
                </span>
              </div>
              <button
                onClick={() => onNavigateTab('contact')}
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
              >
                <span>Responder</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 italic leading-relaxed">
              "{lastCoachMessage ? lastCoachMessage.content : `Fala, ${student.name.split(' ')[0]}! Hoje o foco é manter a cadência controlada e bater a meta de repetições. Qualquer dúvida estou no chat!`}"
            </p>
          </div>
        </div>
      </div>

      {/* 3. Cards de Métricas Principais (Com micro-sparklines e números destacados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Peso Atual"
          value={latestMeasurement ? `${latestMeasurement.weightKg} kg` : '--'}
          subtitle={
            totalWeightDiff !== 0
              ? `${totalWeightDiff > 0 ? '+' : ''}${totalWeightDiff} kg desde o início`
              : 'Primeira aferição'
          }
          icon={Activity}
          sparkline={weightSparkline}
          onClick={() => onNavigateTab('evolution')}
        />

        <StatCard
          title="Composição Corporal"
          value={latestMeasurement?.bodyFatPercentage ? `${latestMeasurement.bodyFatPercentage}%` : 'N/A'}
          subtitle="Percentual de gordura estimado"
          icon={TrendingDown}
          sparkline={fatSparkline}
          onClick={() => onNavigateTab('evolution')}
        />

        <StatCard
          title="Próxima Sessão"
          value={nextSession ? nextSession.time : 'Livre'}
          subtitle={nextSession ? (isSessionToday ? 'Marcada para Hoje' : nextSession.date) : 'Treino autônomo'}
          icon={Calendar}
          onClick={() => onNavigateTab('workout')}
        />

        <StatCard
          title="Status da Mensalidade"
          value={student.paymentStatus === 'EM_DIA' ? 'Em dia' : 'Vence em breve'}
          subtitle={`Vencimento dia ${student.dueDay}`}
          icon={CreditCard}
          onClick={() => onNavigateTab('payment')}
        />
      </div>

      {/* 4. Grid Principal: Herói do Treino + Gráficos + Coluna Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna Principal (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card do Próximo Treino (HERÓI DA PÁGINA) */}
          <div className="relative overflow-hidden rounded-3xl bg-zinc-900/70 border border-white/[0.08] p-6 sm:p-7 shadow-2xl shadow-black/40 backdrop-blur-md transition-all hover:border-white/15">
            <div className="relative z-10 space-y-4">
              {/* Header do Card com Badges Limpos */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                    {isSessionToday ? 'Treino Presencial Hoje' : 'Próxima Rotina em Pauta'}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  {nextSession && (
                    <span className="px-2.5 py-1 rounded-full bg-zinc-800/80 text-zinc-300 font-mono border border-white/[0.06]">
                      {nextSession.time} ({nextSession.durationMinutes} min)
                    </span>
                  )}
                </div>
              </div>

              {/* Título Humanizado */}
              <div>
                <h3 className="text-2xl font-semibold tracking-tight text-zinc-100">
                  {getFriendlyWorkoutName(nextSession?.routineName || activeWorkout?.name)}
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  {activeWorkout?.focus || 'Hipertrofia, estabilidade e força controlada'}
                </p>
              </div>

              {/* Badges de Local e Horário */}
              {nextSession && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {new Date(nextSession.date + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {nextSession.location}
                  </span>
                </div>
              )}

              {/* Barra de Progresso do Treino */}
              <div className="pt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Progresso da ficha</span>
                  <span className="font-mono text-zinc-300">
                    {completedExercises} de {totalExercises} exercícios concluídos ({workoutProgress}%)
                  </span>
                </div>
                <div className="w-full bg-zinc-800/80 h-2 rounded-full overflow-hidden border border-white/[0.04]">
                  <div
                    className="h-full bg-emerald-400 rounded-full transition-all duration-300"
                    style={{ width: `${workoutProgress}%` }}
                  />
                </div>
              </div>

              {/* Botão de Ação Primária em Alta Conversão com Seta Animada */}
              <button
                onClick={() => onNavigateTab('workout')}
                className="group w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm transition-all duration-200 shadow-lg shadow-white/5 active:scale-[0.99] mt-2"
              >
                <Dumbbell className="w-4 h-4 stroke-[2.5]" />
                <span>Abrir Ficha de Treino</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Gráfico de Evolução Física (Curva suave monotone, estilo Linear) */}
          <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Sua Evolução Física
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {totalWeightDiff !== 0
                    ? `${totalWeightDiff > 0 ? '+' : ''}${totalWeightDiff} kg acumulados nas avaliações`
                    : 'Acompanhamento contínuo de pesagem'}
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('evolution')}
                className="text-xs text-zinc-400 hover:text-zinc-200 font-medium flex items-center gap-1 transition-colors"
              >
                <span>Ver Medidas</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {measurements.length > 1 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorStudentPeso" x1="0" y1="0" x2="0" y2="1">
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
                      fill="url(#colorStudentPeso)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 text-xs">
                Aguardando a próxima avaliação física para traçar a curva de progresso.
              </div>
            )}
          </div>

          {/* Tabela de Medidas Recentes (Visual limpo e tipografia elegante) */}
          {latestMeasurement && (
            <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-5 shadow-soft-card backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-100">Medidas Corporais da Última Aferição</h4>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {latestMeasurement.date}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/[0.04] text-xs">
                  <span className="text-zinc-400 block mb-0.5">Cintura</span>
                  <span className="text-base font-semibold text-zinc-100 font-mono">
                    {latestMeasurement.waistCm ? `${latestMeasurement.waistCm} cm` : '--'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/[0.04] text-xs">
                  <span className="text-zinc-400 block mb-0.5">Braço</span>
                  <span className="text-base font-semibold text-zinc-100 font-mono">
                    {latestMeasurement.armsCm ? `${latestMeasurement.armsCm} cm` : '--'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/[0.04] text-xs">
                  <span className="text-zinc-400 block mb-0.5">Tórax</span>
                  <span className="text-base font-semibold text-zinc-100 font-mono">
                    {latestMeasurement.chestCm ? `${latestMeasurement.chestCm} cm` : '--'}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/[0.04] text-xs">
                  <span className="text-zinc-400 block mb-0.5">Coxa</span>
                  <span className="text-base font-semibold text-zinc-100 font-mono">
                    {latestMeasurement.thighsCm ? `${latestMeasurement.thighsCm} cm` : '--'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Coluna Lateral (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Card: Meus Treinos Ativos */}
          <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-5 shadow-soft-card space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-zinc-100 text-sm">Rotinas de Treino</h4>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {student.workouts.length} fichas
              </span>
            </div>

            <div className="space-y-2">
              {student.workouts.map((w) => (
                <div
                  key={w.id}
                  onClick={() => onNavigateTab('workout')}
                  className="p-3 rounded-2xl bg-zinc-800/30 hover:bg-zinc-800/60 border border-white/[0.04] hover:border-white/[0.08] cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-semibold text-xs text-zinc-200 block truncate group-hover:text-zinc-100">
                      {w.name.split('-')[0].trim()}
                    </span>
                    <span className="text-[11px] text-zinc-400 truncate block">{w.focus}</span>
                  </div>
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded-full text-zinc-400 font-mono">
                    {w.exercises.length} ex
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigateTab('workout')}
              className="w-full py-2.5 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-200 text-xs font-medium border border-white/[0.06] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Ver Todas as Fichas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card: Mensalidade & Chave PIX em 1 Clique */}
          <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-5 shadow-soft-card space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h4 className="font-semibold text-zinc-100 text-sm">Mensalidade & PIX</h4>
              </div>
              <Badge
                variant={student.paymentStatus === 'EM_DIA' ? 'success' : 'warning'}
                size="sm"
              >
                {student.paymentStatus === 'EM_DIA' ? 'Em dia' : 'Vence em breve'}
              </Badge>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-800/40 border border-white/[0.04] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Valor do Plano:</span>
                <span className="font-semibold text-zinc-100 font-mono">R$ {student.monthlyFee},00</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Chave PIX:</span>
                <span className="font-mono text-zinc-300 truncate max-w-[130px]">
                  {personal.pixKey}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyPix}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-xs border border-white/[0.08] transition-all active:scale-[0.99]"
            >
              {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
              <span>{copiedPix ? 'Chave PIX Copiada!' : 'Copiar Chave PIX'}</span>
            </button>
          </div>

          {/* Card: Chat com o Coach (Mini CRM) */}
          <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-5 shadow-soft-card space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <img
                    src={personal.avatarUrl}
                    alt={personal.name}
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-400 border border-[#09090b] rounded-full" />
                </div>
                <div>
                  <h4 className="font-semibold text-zinc-200 text-xs">{personal.name}</h4>
                  <span className="text-[10px] text-zinc-400">Treinador</span>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('contact')}
                className="p-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Abrir Chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => onNavigateTab('contact')}
              className="w-full py-2 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium border border-white/[0.04] transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Enviar Mensagem no Chat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card: Próxima Reavaliação Física */}
          {student.nextAssessmentDate && (
            <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-4 flex items-center gap-3 backdrop-blur-md">
              <div className="p-2 rounded-xl bg-zinc-800/80 text-zinc-300 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-medium text-zinc-400 block">
                  Próxima Reavaliação
                </span>
                <span className="text-xs font-semibold text-zinc-200 block truncate">
                  {new Date(student.nextAssessmentDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
