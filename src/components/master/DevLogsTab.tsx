import React, { useState, useEffect } from 'react';
import {
  systemLogger,
  SystemLogEntry,
  LogSeverity,
  LogCategory,
} from '../../lib/systemLogger';
import { resetRateLimit } from '../../lib/rateLimiter';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  Bug,
  Database,
  Mail,
  Lock,
  Search,
  RotateCcw,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Terminal,
  Activity,
  CheckCircle2,
  HelpCircle,
  Wrench,
  Sparkles,
  Server,
} from 'lucide-react';

export const DevLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(systemLogger.getLogs());
    };
    updateLogs();
    const unsubscribe = systemLogger.subscribe(updateLogs);
    return () => unsubscribe();
  }, []);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleClearLogs = () => {
    if (window.confirm('Tem certeza que deseja limpar todo o histórico de logs local?')) {
      systemLogger.clear();
      showFeedback('Histórico de logs limpo com sucesso.');
    }
  };

  const handleExportLogs = () => {
    const jsonStr = systemLogger.exportAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fitcoach_telemetria_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showFeedback('Arquivo de logs exportado com sucesso.');
  };

  const handleResetRateLimits = () => {
    resetRateLimit('LOGIN');
    resetRateLimit('SIGNUP');
    resetRateLimit('EMAIL_SEND');
    resetRateLimit('INVITE_VALIDATION');
    systemLogger.info('SECURITY', 'DEV_RATE_LIMIT_MANUAL_RESET', 'O desenvolvedor resetou manualmente os bloqueios de rate limit.');
    showFeedback('Rate limits resetados! Bloqueios por IP e Conta foram zerados.');
  };

  const handleSimulateTestError = () => {
    systemLogger.error(
      'DATABASE',
      'DATABASE_RLS_VIOLATION',
      'Simulação de teste: Falha na permissão de leitura da tabela workout_plans (RLS).',
      { simulated: true, userRole: 'STUDENT', table: 'workout_plans' }
    );
    showFeedback('Evento de teste simulado e registrado no feed!');
  };

  // Filtragem dos logs
  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      searchQuery === '' ||
      l.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.identifier && l.identifier.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (l.probableCause && l.probableCause.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSeverity =
      selectedSeverity === 'ALL' || l.severity === selectedSeverity;

    const matchesCategory =
      selectedCategory === 'ALL' || l.category === selectedCategory;

    return matchesSearch && matchesSeverity && matchesCategory;
  });

  // Métricas
  const totalCount = logs.length;
  const criticalCount = logs.filter((l) => l.severity === 'CRITICAL').length;
  const errorCount = logs.filter((l) => l.severity === 'ERROR').length;
  const warnCount = logs.filter((l) => l.severity === 'WARN').length;

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  };

  const getSeverityBadge = (severity: LogSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            Crítico
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            <Bug className="w-3 h-3 text-red-400" />
            Erro
          </span>
        );
      case 'WARN':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Aviso
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Info className="w-3 h-3 text-emerald-400" />
            Info
          </span>
        );
    }
  };

  const getCategoryIcon = (category: LogCategory) => {
    switch (category) {
      case 'SECURITY':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'AUTH':
        return <Lock className="w-3.5 h-3.5 text-teal-400" />;
      case 'DATABASE':
        return <Database className="w-3.5 h-3.5 text-indigo-400" />;
      case 'EMAIL':
        return <Mail className="w-3.5 h-3.5 text-sky-400" />;
      case 'RUNTIME':
        return <Bug className="w-3.5 h-3.5 text-amber-400" />;
      case 'NETWORK':
        return <Activity className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Terminal className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs text-zinc-400 hover:text-zinc-200">
            ✕
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total de Logs */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Telemetria Registrada</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-zinc-100 font-mono">
            {totalCount}
          </div>
          <p className="text-[11px] text-zinc-400">Buffer circular ativo (máx 250)</p>
        </div>

        {/* Card 2: Incidentes Críticos */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Bloqueios Críticos</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 font-mono">
            {criticalCount}
          </div>
          <p className="text-[11px] text-zinc-400">Rate limits e bloqueios ativos</p>
        </div>

        {/* Card 3: Erros de Runtime / DB */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Erros Registrados</span>
            <Bug className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-extrabold text-red-400 font-mono">
            {errorCount}
          </div>
          <p className="text-[11px] text-zinc-400">Exceções e falhas capturadas</p>
        </div>

        {/* Card 4: Avisos / Bot Challenges */}
        <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-2">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avisos & Alertas</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-mono">
            {warnCount}
          </div>
          <p className="text-[11px] text-zinc-400">Alertas de segurança e CAPTCHA</p>
        </div>
      </div>

      {/* Action Bar (Dev Tools) */}
      <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Wrench className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-zinc-100">Ações Rápidas de Diagnóstico</h3>
            <p className="text-[10px] text-zinc-400">Ferramentas para testes em tempo real da engenharia</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetRateLimits}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.06] flex items-center gap-1.5 transition-colors"
            title="Zera bloqueios locais de IP e Conta"
          >
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            <span>Resetar Rate Limit</span>
          </button>

          <button
            onClick={handleSimulateTestError}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.06] flex items-center gap-1.5 transition-colors"
            title="Dispara um log de erro para verificar o feed"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Simular Erro de Teste</span>
          </button>

          <button
            onClick={handleExportLogs}
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-white/[0.06] flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exportar JSON</span>
          </button>

          <button
            onClick={handleClearLogs}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium border border-rose-500/20 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Limpar Logs</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-5 rounded-3xl bg-zinc-900/80 border border-white/[0.08] backdrop-blur-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrar por mensagem, evento, e-mail ou causa do problema..."
              className="w-full bg-zinc-950/80 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {/* Filtro de Severidade */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/[0.08] overflow-x-auto text-xs">
            {['ALL', 'CRITICAL', 'ERROR', 'WARN', 'INFO'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedSeverity === sev
                    ? 'bg-amber-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sev === 'ALL' ? 'Todas' : sev}
              </button>
            ))}
          </div>

          {/* Filtro de Categoria */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 rounded-xl border border-white/[0.08] overflow-x-auto text-xs">
            {['ALL', 'SECURITY', 'AUTH', 'EMAIL', 'DATABASE', 'RUNTIME'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-emerald-500 text-zinc-950 font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat === 'ALL' ? 'Categorias' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Count Text */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-white/[0.06]">
          <span>Mostrando {filteredLogs.length} de {logs.length} eventos registrados</span>
          <span className="font-mono">Logs armazenados com segurança local</span>
        </div>
      </div>

      {/* Logs Feed List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-zinc-900/60 border border-white/[0.06] space-y-3">
            <Terminal className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-medium text-zinc-300">Nenhum evento corresponde aos filtros selecionados</p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Tente redefinir os filtros de busca ou clique em "Simular Erro de Teste" para registrar uma telemetria.
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <div
                key={log.id}
                className="rounded-3xl bg-zinc-900/80 border border-white/[0.08] overflow-hidden transition-all shadow-xl shadow-black/40"
              >
                {/* Header Row */}
                <div
                  onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityBadge(log.severity)}</div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded-md border border-white/[0.06]">
                          {getCategoryIcon(log.category)}
                          <span>{log.category}</span>
                        </span>
                        <span className="text-xs font-semibold text-zinc-200 font-mono">
                          {log.event}
                        </span>
                        {log.identifier && (
                          <span className="text-[11px] text-amber-300/90 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {log.identifier}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                        {log.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 text-xs text-zinc-400">
                    <span className="text-[11px] font-mono text-zinc-500">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
                      aria-label={isExpanded ? 'Recolher detalhes' : 'Expandir compreensão e detalhes'}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Diagnostic Panel ("Compreensão do Problema") */}
                {isExpanded && (
                  <div className="p-5 bg-zinc-950/80 border-t border-white/[0.06] space-y-4 animate-in fade-in duration-200">
                    {/* Painel Didático de Diagnóstico */}
                    {(log.probableCause || log.recommendedAction) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {log.probableCause && (
                          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                              <HelpCircle className="w-4 h-4 text-amber-400" />
                              <span>Provável Causa do Problema</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {log.probableCause}
                            </p>
                          </div>
                        )}

                        {log.recommendedAction && (
                          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                              <Wrench className="w-4 h-4 text-emerald-400" />
                              <span>Ação Recomendada de Solução</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                              {log.recommendedAction}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadados Técnicos Adicionais */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                          Metadados & Contexto da Execução
                        </span>
                        <pre className="p-3.5 rounded-2xl bg-zinc-950 border border-white/[0.08] text-[11px] font-mono text-zinc-300 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
