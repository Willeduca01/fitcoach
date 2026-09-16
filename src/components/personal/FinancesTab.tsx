import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Invoice, InvoiceStatus } from '../../types';
import { StatCard } from '../common/StatCard';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import {
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  MessageCircle,
  QrCode,
  Edit,
  ArrowUpRight,
  Filter,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';

export const FinancesTab: React.FC = () => {
  const { invoices, students, personal, markInvoicePaid, updatePersonalProfile } = useAppData();

  const [filterPeriod, setFilterPeriod] = useState<'MES' | 'TRIMESTRE' | 'ANO'>('MES');
  const [filterStatus, setFilterStatus] = useState<'ALL' | InvoiceStatus>('ALL');

  // Modal para editar chave PIX do personal
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixKey, setPixKey] = useState(personal.pixKey);
  const [pixType, setPixType] = useState(personal.pixType);
  const [copiedPix, setCopiedPix] = useState(false);

  // Cálculos financeiros
  const paidInvoices = invoices.filter((i) => i.status === 'PAGO');
  const pendingInvoices = invoices.filter((i) => i.status === 'PENDENTE');
  const overdueInvoices = invoices.filter((i) => i.status === 'ATRASADO');

  const totalPaid = paidInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalPending = pendingInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOverdue = overdueInvoices.reduce((acc, curr) => acc + curr.amount, 0);
  const totalProjected = totalPaid + totalPending + totalOverdue;

  const handleSavePix = (e: React.FormEvent) => {
    e.preventDefault();
    updatePersonalProfile({ pixKey, pixType });
    setIsPixModalOpen(false);
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText(personal.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const getWhatsappBillingUrl = (invoice: Invoice) => {
    const student = students.find((s) => s.id === invoice.studentId);
    const cleanPhone = student?.phone.replace(/\D/g, '') || '';

    const message = `Olá, ${invoice.studentName}! Tudo bem? 🏋️‍♂️

Passando para lembrar que sua mensalidade referente ao seu acompanhamento com o Coach Marcus está com vencimento em *${invoice.dueDate}* no valor de *R$ ${invoice.amount},00*.

🔑 *Chave PIX para pagamento (${personal.pixType}):*
${personal.pixKey}

Após realizar a transferência, por favor me envie o comprovante por aqui. Qualquer dúvida estou à disposição! 💪`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (filterStatus === 'ALL') return true;
    return inv.status === filterStatus;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight flex items-center gap-2.5">
            <DollarSign className="w-6 h-6 text-emerald-400" />
            Gestão Financeira & Cobranças
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Controle de mensalidades, cobranças automáticas via WhatsApp e recebimentos PIX.
          </p>
        </div>

        {/* PIX Key Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPixModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/80 text-zinc-200 border border-white/[0.08] text-xs font-medium transition-colors"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Configurar Chave PIX</span>
          </button>
        </div>
      </div>

      {/* PIX Quick Card */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl shadow-black/40">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase text-emerald-400">Sua Chave PIX Ativa</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono border border-white/[0.06]">
                {personal.pixType}
              </span>
            </div>
            <p className="text-sm font-mono font-semibold text-zinc-100 tracking-wide mt-0.5 select-all">
              {personal.pixKey}
            </p>
          </div>
        </div>

        <button
          onClick={copyPixKey}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-semibold transition-all shadow-sm"
        >
          {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copiedPix ? 'Copiada!' : 'Copiar Chave'}</span>
        </button>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Recebido no Ciclo"
          value={`R$ ${totalPaid.toLocaleString('pt-BR')}`}
          subtitle={`${paidInvoices.length} mensalidade(s) pagas`}
          icon={CheckCircle2}
          sparkline={[4800, 5200, 5900, 6400, 7100]}
        />
        <StatCard
          title="A Receber (No Prazo)"
          value={`R$ ${totalPending.toLocaleString('pt-BR')}`}
          subtitle={`${pendingInvoices.length} fatura(s) a vencer`}
          icon={Clock}
          variant="amber"
        />
        <StatCard
          title="Em Atraso (Cobrança)"
          value={`R$ ${totalOverdue.toLocaleString('pt-BR')}`}
          subtitle={`${overdueInvoices.length} aluno(s) inadimplente(s)`}
          icon={AlertCircle}
          variant="rose"
        />
        <StatCard
          title="Projeção Total do Ciclo"
          value={`R$ ${totalProjected.toLocaleString('pt-BR')}`}
          subtitle="Meta prevista do ciclo"
          icon={DollarSign}
        />
      </div>

      {/* Invoices List Section */}
      <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] p-5 shadow-2xl shadow-black/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              Faturas & Histórico de Cobrança
            </h3>
            <p className="text-xs text-zinc-400">
              Dispare cobranças com mensagens personalizadas no WhatsApp ou registre baixas manuais.
            </p>
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1 bg-zinc-950/60 border border-white/[0.08] rounded-xl p-1 text-xs">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'ALL' ? 'bg-zinc-800 text-zinc-100 border border-white/[0.06]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterStatus('ATRASADO')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'ATRASADO'
                  ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Atrasadas
            </button>
            <button
              onClick={() => setFilterStatus('PENDENTE')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'PENDENTE'
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('PAGO')}
              className={`px-3 py-1 rounded-lg transition-colors font-medium ${
                filterStatus === 'PAGO'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Pagas
            </button>
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8 text-zinc-500 text-sm">
            Nenhuma fatura encontrada com os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/[0.06]">
                <tr>
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4">Vencimento</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredInvoices.map((invoice) => {
                  const isPaid = invoice.status === 'PAGO';
                  const isOverdue = invoice.status === 'ATRASADO';

                  return (
                    <tr key={invoice.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-zinc-100">
                        {invoice.studentName}
                      </td>
                      <td className="py-3 px-4 font-mono text-zinc-400">
                        {invoice.dueDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-zinc-100 font-mono">
                        R$ {invoice.amount.toLocaleString('pt-BR')},00
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={isPaid ? 'success' : isOverdue ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {invoice.paidDate ? (
                          <span className="font-mono text-[11px] text-emerald-400">
                            Pago em {invoice.paidDate} ({invoice.paymentMethod || 'PIX'})
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Aguardando</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isPaid && (
                            <>
                              <a
                                href={getWhatsappBillingUrl(invoice)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
                                title="Cobrar no WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Cobrar no WhatsApp</span>
                              </a>

                              <button
                                onClick={() => markInvoicePaid(invoice.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                                title="Dar baixa manual"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Dar Baixa</span>
                              </button>
                            </>
                          )}
                          {isPaid && (
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Quitado
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Configurar Chave PIX */}
      <Modal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        title="Configurar Chave PIX para Cobrança"
        subtitle="Esta chave será enviada nos links de WhatsApp e exibida no portal do aluno"
      >
        <form onSubmit={handleSavePix} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Tipo de Chave PIX</label>
            <select
              value={pixType}
              onChange={(e) => setPixType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              <option value="EMAIL">E-mail</option>
              <option value="CPF">CPF</option>
              <option value="TELEFONE">Telefone</option>
              <option value="ALEATORIA">Chave Aleatória</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Chave PIX</label>
            <input
              type="text"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="Digite sua chave PIX..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsPixModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              Salvar Chave PIX
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
