import React, { useState } from 'react';
import { Student } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { Badge } from '../common/Badge';
import {
  CreditCard,
  QrCode,
  Copy,
  Check,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface PaymentTabProps {
  student: Student;
}

export const PaymentTab: React.FC<PaymentTabProps> = ({ student }) => {
  const { personal, invoices } = useAppData();
  const [copiedPix, setCopiedPix] = useState(false);

  const studentInvoices = invoices.filter((i) => i.studentId === student.id);

  const copyPixKey = () => {
    navigator.clipboard.writeText(personal.pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto w-full pb-12">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          Mensalidade & Pagamento PIX
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Consulte o status do seu plano ativo e efetue pagamentos diretamente via PIX.
        </p>
      </div>

      {/* Main Status Card */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400">
            Assinatura Ativa
          </span>
          <Badge
            variant={
              student.paymentStatus === 'EM_DIA'
                ? 'success'
                : student.paymentStatus === 'VENCE_EM_BREVE'
                ? 'warning'
                : 'danger'
            }
            size="md"
          >
            {student.paymentStatus === 'EM_DIA'
              ? 'Mensalidade em Dia'
              : student.paymentStatus === 'VENCE_EM_BREVE'
              ? 'Vence em Breve (3 dias)'
              : 'Pagamento em Atraso'}
          </Badge>
        </div>

        <div className="flex items-baseline justify-between border-y border-white/[0.06] py-4">
          <div>
            <h3 className="text-2xl font-semibold text-zinc-100">Plano {student.plan}</h3>
            <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <span>Vencimento todo dia {student.dueDay} de cada mês</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-zinc-500 uppercase block font-medium">Valor</span>
            <span className="text-2xl font-semibold text-zinc-100 font-mono">
              R$ {student.monthlyFee},00
            </span>
          </div>
        </div>

        {student.paymentStatus !== 'EM_DIA' && (
          <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Aviso de vencimento</span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Utilize a chave PIX abaixo para efetuar o acerto e manter a regularidade do seu acompanhamento.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chave PIX Card */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300 shrink-0 border border-white/[0.04]">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-100">Pagamento via PIX</h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono border border-white/[0.04]">
                {personal.pixType}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Favorecido: {personal.name}
            </p>
          </div>
        </div>

        {/* Chave Box */}
        <div className="p-3.5 rounded-2xl bg-zinc-800/40 border border-white/[0.06] flex items-center justify-between gap-3">
          <span className="font-mono text-xs sm:text-sm font-medium text-zinc-200 select-all truncate">
            {personal.pixKey}
          </span>
          <button
            onClick={copyPixKey}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition-all shadow-subtle shrink-0 active:scale-[0.99]"
          >
            {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPix ? 'Copiado!' : 'Copiar PIX'}</span>
          </button>
        </div>

        <p className="text-xs text-zinc-500 text-center">
          Após realizar a transferência, confirme com o Coach no chat interno.
        </p>
      </div>

      {/* Histórico de Faturas do Aluno */}
      <div className="rounded-3xl bg-zinc-900/60 border border-white/[0.06] p-6 shadow-soft-card backdrop-blur-md space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">Histórico de Faturas</h3>

        {studentInvoices.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-4">
            Nenhuma fatura registrada.
          </p>
        ) : (
          <div className="space-y-2">
            {studentInvoices.map((inv) => {
              const isPaid = inv.status === 'PAGO';
              return (
                <div
                  key={inv.id}
                  className="p-3.5 rounded-2xl bg-zinc-800/20 border border-white/[0.04] flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-xl ${
                        isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-200 block">
                        Vencimento: {inv.dueDate}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {isPaid ? `Quitado via ${inv.paymentMethod || 'PIX'}` : 'Aguardando pagamento'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-semibold text-zinc-100 block">
                      R$ {inv.amount},00
                    </span>
                    <Badge variant={isPaid ? 'success' : 'warning'} size="sm">
                      {isPaid ? 'Pago' : 'Pendente'}
                    </Badge>
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
