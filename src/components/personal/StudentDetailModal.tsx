import React, { useState } from 'react';
import { Student, PlanType, PaymentStatus, StudentStatus } from '../../types';
import { useAppData } from '../../context/AppDataContext';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { WorkoutBuilder } from './WorkoutBuilder';
import { PhysicalAssessment } from './PhysicalAssessment';
import {
  User,
  Dumbbell,
  Activity,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Edit2,
  Trash2,
  Flame,
  Check
} from 'lucide-react';

interface StudentDetailModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenChat?: (studentId: string) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  student,
  isOpen,
  onClose,
  onOpenChat,
}) => {

  const { updateStudent, deleteStudent } = useAppData();
  const [activeTab, setActiveTab] = useState<'workouts' | 'assessment' | 'contract'>('workouts');

  // Edit contract fields state
  const [isEditingContract, setIsEditingContract] = useState(false);
  const [plan, setPlan] = useState<PlanType>(student?.plan || 'MENSAL');
  const [monthlyFee, setMonthlyFee] = useState(student?.monthlyFee || 350);
  const [dueDay, setDueDay] = useState(student?.dueDay || 10);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(student?.paymentStatus || 'EM_DIA');
  const [status, setStatus] = useState<StudentStatus>(student?.status || 'ATIVO');
  const [primaryGoal, setPrimaryGoal] = useState(student?.primaryGoal || '');
  const [notes, setNotes] = useState(student?.notes || '');

  if (!student) return null;

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    updateStudent({
      ...student,
      plan,
      monthlyFee: Number(monthlyFee),
      dueDay: Number(dueDay),
      paymentStatus,
      status,
      primaryGoal,
      notes,
    });
    setIsEditingContract(false);
  };

  const handleDelete = () => {
    if (confirm(`Tem certeza que deseja excluir o aluno ${student.name}? Todas as fichas e avaliações serão removidas.`)) {
      deleteStudent(student.id);
      onClose();
    }
  };

  const cleanPhone = student.phone.replace(/\D/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá ${student.name}! Tudo bem?`)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={student.name}
      subtitle={`Ficha do Aluno • Início em ${student.startDate}`}
      maxWidth="4xl"
    >
      <div className="space-y-6 font-sans">
        {/* Top Profile Summary Bar */}
        <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/40 shrink-0"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-zinc-100">{student.name}</h3>
                <Badge
                  variant={
                    student.paymentStatus === 'EM_DIA'
                      ? 'success'
                      : student.paymentStatus === 'VENCE_EM_BREVE'
                      ? 'warning'
                      : 'danger'
                  }
                  size="sm"
                >
                  {student.paymentStatus === 'EM_DIA'
                    ? 'Mensalidade em Dia'
                    : student.paymentStatus === 'VENCE_EM_BREVE'
                    ? 'Vence em Breve'
                    : 'Em Atraso'}
                </Badge>
              </div>

              <p className="text-xs text-emerald-400 font-medium mt-0.5">
                Meta: <span className="text-zinc-300">{student.primaryGoal}</span>
              </p>

              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1 text-amber-300">
                  <Flame className="w-3.5 h-3.5" />
                  {student.streakDays} dias de sequência
                </span>
                <span>•</span>
                <span>Plano {student.plan} (R$ {student.monthlyFee}/mês)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChat && (
              <button
                onClick={() => {
                  onClose();
                  onOpenChat(student.id);
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                <span>Chat Interno</span>
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Excluir aluno"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-2">
          <button
            onClick={() => setActiveTab('workouts')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'workouts'
                ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>Fichas de Treino ({student.workouts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'assessment'
                ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Avaliação Física ({student.measurements.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contract')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              activeTab === 'contract'
                ? 'bg-zinc-800 text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Dados & Contrato</span>
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'workouts' && <WorkoutBuilder student={student} />}

          {activeTab === 'assessment' && <PhysicalAssessment student={student} />}

          {activeTab === 'contract' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white">Contrato e Dados Cadastrais</h4>
                <button
                  onClick={() => setIsEditingContract(!isEditingContract)}
                  className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{isEditingContract ? 'Cancelar Edição' : 'Editar Dados'}</span>
                </button>
              </div>

              {isEditingContract ? (
                <form onSubmit={handleSaveContract} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Plano de Treino</label>
                      <select
                        value={plan}
                        onChange={(e) => setPlan(e.target.value as PlanType)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="MENSAL">Mensal</option>
                        <option value="TRIMESTRAL">Trimestral</option>
                        <option value="SEMESTRAL">Semestral</option>
                        <option value="ANUAL">Anual</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Mensalidade (R$)</label>
                      <input
                        type="number"
                        value={monthlyFee}
                        onChange={(e) => setMonthlyFee(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Dia do Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Status do Pagamento</label>
                      <select
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="EM_DIA">Em Dia</option>
                        <option value="VENCE_EM_BREVE">Vence em Breve</option>
                        <option value="ATRASADO">Atrasado</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">Status da Matrícula</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as StudentStatus)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                        <option value="PENDENTE">Pendente</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Objetivo Principal</label>
                    <input
                      type="text"
                      value={primaryGoal}
                      onChange={(e) => setPrimaryGoal(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Observações Técnicas / Anamnese</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Plano Contratado:</span>
                      <span className="font-bold text-white">{student.plan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Mensal:</span>
                      <span className="font-bold text-emerald-400">R$ {student.monthlyFee},00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vencimento Mensal:</span>
                      <span className="font-bold text-white">Todo dia {student.dueDay}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Telefone / WhatsApp:</span>
                      <span className="font-bold text-white">{student.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">E-mail:</span>
                      <span className="font-bold text-white">{student.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status Cadastral:</span>
                      <span className="font-bold text-white">{student.status}</span>
                    </div>
                  </div>

                  {student.notes && (
                    <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <span className="text-slate-400 font-semibold block mb-1">Notas / Anamnese:</span>
                      <p className="text-slate-300">{student.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
