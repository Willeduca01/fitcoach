import React from 'react';
import { useAppData } from '../../context/AppDataContext';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import {
  Users,
  DollarSign,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  TrendingUp,
  ArrowUpRight,
  Dumbbell
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { TODAY_STR } from '../../data/mockData';
import { Student } from '../../types';

interface OverviewTabProps {
  onSelectStudent: (student: Student) => void;
  onNavigateTab: (tab: 'schedule' | 'students' | 'finances') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  onSelectStudent,
  onNavigateTab,
}) => {
  const { personal, students, sessions, invoices, financialHistory, updateSessionStatus, isDemoMode } = useAppData();

  // Cálculos de KPIs
  const activeStudents = students.filter((s) => s.status === 'ATIVO');
  const inactiveStudents = students.filter((s) => s.status !== 'ATIVO');

  const pendingDueInvoices = invoices.filter((i) => i.status === 'PENDENTE');
  const overdueInvoices = invoices.filter((i) => i.status === 'ATRASADO');
  const paidInvoicesCurrentMonth = invoices.filter((i) => i.status === 'PAGO');

  const totalPaidCurrentMonth = paidInvoicesCurrentMonth.reduce((acc, curr) => acc + curr.amount, 0);
  const totalProjected = invoices.reduce((acc, curr) => acc + curr.amount, 0);

  // Sessões de Hoje
  const todaySessions = sessions.filter((s) => s.date === TODAY_STR);

  // Dados para o Donut Chart de Status
  const pieData = [
    { name: 'Em Dia (Adimplentes)', value: students.filter((s) => s.paymentStatus === 'EM_DIA').length, color: '#10b981' },
    { name: 'Vence em Breve (≤5d)', value: students.filter((s) => s.paymentStatus === 'VENCE_EM_BREVE').length, color: '#f59e0b' },
    { name: 'Em Atraso', value: students.filter((s) => s.paymentStatus === 'ATRASADO').length, color: '#f43f5e' },
  ].filter((item) => item.value > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Top Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight">
            Painel Geral & Métricas
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {isDemoMode ? (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Modo Demonstrativo Ativo</span> — Apresentação comercial de funcionalidades.
              </span>
            ) : (
              `Olá, ${personal.name}! Visão executiva em tempo real dos seus alunos, faturamento e agenda.`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigateTab('schedule')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 border border-white/[0.08] text-xs font-medium text-zinc-200 transition-colors"
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Ver Agenda Completa</span>
          </button>
          <button
            onClick={() => onNavigateTab('finances')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-colors shadow-lg shadow-emerald-500/10"
          >
            <DollarSign className="w-4 h-4 stroke-[2.5]" />
            <span>Cobranças</span>
          </button>
        </div>
      </div>

      {/* Onboarding Banner para Treinadores Novos / Reais sem alunos ainda */}
      {!isDemoMode && students.length === 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                  Boas-vindas ao FitCoach
                </span>
                <h3 className="text-lg font-bold text-white">Sua conta de treinador está ativa!</h3>
              </div>
              <p className="text-sm text-zinc-400 max-w-xl">
                Você ainda não possui alunos vinculados. Gere um convite exclusivo ou cadastre seus alunos para começar a prescrever treinos e acompanhar mensalidades.
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('students')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 shrink-0"
            >
              <Users className="w-4 h-4" />
              <span>Convidar Primeiro Aluno</span>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alunos Ativos"
          value={activeStudents.length}
          subtitle={`${inactiveStudents.length} inativo(s)`}
          icon={Users}
          onClick={() => onNavigateTab('students')}
        />
        <StatCard
          title="Receita Realizada"
          value={`R$ ${totalPaidCurrentMonth.toLocaleString('pt-BR')}`}
          subtitle={`Projetado: R$ ${totalProjected.toLocaleString('pt-BR')}`}
          icon={DollarSign}
          trend={{ value: '+12.5%', isPositive: true }}
          sparkline={[5200, 5800, 6100, 6400, 6900, 7200]}
          onClick={() => onNavigateTab('finances')}
        />
        <StatCard
          title="Alertas de Cobrança"
          value={overdueInvoices.length + pendingDueInvoices.length}
          subtitle={`${overdueInvoices.length} vencida(s) • ${pendingDueInvoices.length} a vencer`}
          icon={AlertTriangle}
          variant={overdueInvoices.length > 0 ? 'rose' : 'amber'}
          onClick={() => onNavigateTab('finances')}
        />
        <StatCard
          title="Sessões de Hoje"
          value={todaySessions.length}
          subtitle={`${todaySessions.filter(s => s.status === 'REALIZADA').length} concluída(s)`}
          icon={Calendar}
          onClick={() => onNavigateTab('schedule')}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Evolution (Area Chart) */}
        <div className="lg:col-span-2 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-5 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Evolução do Faturamento (Últimos 6 Meses)
              </h3>
              <p className="text-xs text-zinc-400">Receita confirmada vs. projetada</p>
            </div>
            <span className="text-xs text-emerald-300 font-medium bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Crescimento constante
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecebido" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorProjetado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#71717a" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" stroke="var(--chart-axis, #52525b)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--chart-grid, #27272a)' }} />
                <YAxis stroke="var(--chart-axis, #52525b)" fontSize={11} tickLine={false} axisLine={{ stroke: 'var(--chart-grid, #27272a)' }} tickFormatter={(val) => `R$${val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #18181b)',
                    borderColor: 'var(--tooltip-border, rgba(255,255,255,0.08))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: 'var(--tooltip-text, #f4f4f5)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }}
                  itemStyle={{ color: 'var(--tooltip-text, #f4f4f5)' }}
                  labelStyle={{ color: 'var(--tooltip-text, #f4f4f5)' }}
                  formatter={(value: any) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, '']}
                />
                <Area type="monotone" dataKey="projetado" name="Projetado" stroke="#71717a" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorProjetado)" />
                <Area type="monotone" dataKey="recebido" name="Recebido" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRecebido)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution (Donut Chart) */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-5 shadow-2xl shadow-black/40 flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-zinc-100">Status dos Alunos</h3>
            <p className="text-xs text-zinc-400">Distribuição financeira da base ativa</p>
          </div>

          <div className="h-56 w-full flex-1 flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-center px-4 py-8 text-zinc-500 text-xs">
                <Users className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-50" />
                Nenhum aluno ativo no momento.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={75}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="#09090b" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px', fontSize: '12px', color: '#f4f4f5' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => <span className="text-xs text-zinc-400">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Agenda Rápida do Dia */}
      <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-5 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Agenda do Dia (Hoje)
            </h3>
            <p className="text-xs text-zinc-400">Aulas marcadas e controle rápido de presença</p>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Nenhuma sessão agendada para hoje.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {todaySessions.map((session) => {
              const student = students.find((s) => s.id === session.studentId);
              const isDone = session.status === 'REALIZADA';

              return (
                <div
                  key={session.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isDone
                      ? 'bg-emerald-500/[0.05] border-emerald-500/20'
                      : 'bg-zinc-900/80 border-white/[0.06] hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      {student && (
                        <img
                          src={student.avatarUrl}
                          alt={student.name}
                          className="w-9 h-9 rounded-full object-cover ring-1 ring-white/10"
                        />
                      )}
                      <div>
                        <h4 className="font-medium text-zinc-100 text-sm">{session.studentName}</h4>
                        <div className="flex items-center gap-1 text-xs text-emerald-400 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>{session.time} ({session.durationMinutes} min)</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant={isDone ? 'success' : 'info'}
                      size="sm"
                    >
                      {session.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mb-3 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                    <span className="truncate">{session.location}</span>
                  </div>

                  {session.routineName && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-zinc-800/60 text-[11px] text-zinc-300 flex items-center gap-1.5 border border-white/[0.04]">
                      <Dumbbell className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{session.routineName}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                    {student && (
                      <button
                        onClick={() => onSelectStudent(student)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 text-xs font-medium transition-colors border border-white/[0.06]"
                      >
                        Abrir Ficha
                      </button>
                    )}
                    <button
                      onClick={() => updateSessionStatus(session.id, isDone ? 'AGENDADA' : 'REALIZADA')}
                      className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-xs font-medium transition-colors ${
                        isDone
                          ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-white/[0.06]'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold shadow-sm'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isDone ? 'Desmarcar' : 'Concluir'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
