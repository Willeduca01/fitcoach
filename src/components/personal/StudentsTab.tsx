import React, { useState } from 'react';
import { useAppData } from '../../context/AppDataContext';
import { Student, PlanType, StudentStatus, PaymentStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { StudentDetailModal } from './StudentDetailModal';
import { InviteStudentModal } from './InviteStudentModal';
import {
  Users,
  Plus,
  Search,
  MessageSquare,
  Dumbbell,
  Flame,
  ChevronRight,
  Filter,
  Calendar,
  Activity,
  UserPlus
} from 'lucide-react';

interface StudentsTabProps {
  selectedStudentFromOutside?: Student | null;
  onOpenChat?: (studentId: string) => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({
  selectedStudentFromOutside,
  onOpenChat,
}) => {

  const { students, addStudent } = useAppData();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterPayment, setFilterPayment] = useState<'ALL' | PaymentStatus>('ALL');
  const [activeModalStudent, setActiveModalStudent] = useState<Student | null>(selectedStudentFromOutside || null);

  // Form para novo aluno
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('5511');
  const [plan, setPlan] = useState<PlanType>('MENSAL');
  const [monthlyFee, setMonthlyFee] = useState(380);
  const [dueDay, setDueDay] = useState(10);
  const [primaryGoal, setPrimaryGoal] = useState('Hipertrofia & Definição');
  const [notes, setNotes] = useState('');

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    // Avatar padrão com base em inicial ou foto pública neutra
    const avatarUrl = `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces`;

    addStudent({
      name,
      email,
      phone,
      avatarUrl,
      status: 'ATIVO',
      plan,
      monthlyFee,
      dueDay,
      paymentStatus: 'EM_DIA',
      startDate: new Date().toISOString().split('T')[0],
      primaryGoal,
      notes,
    });

    setIsNewStudentModalOpen(false);
    setName('');
    setEmail('');
    setNotes('');
  };

  const filteredStudents = students.filter((student) => {
    const matchesQuery =
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery);

    const matchesPayment = filterPayment === 'ALL' || student.paymentStatus === filterPayment;

    return matchesQuery && matchesPayment;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-emerald-400" />
            Gestão de Clientes & CRM
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Fichas cadastrais, treinos divididos, histórico antropométrico e contratos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-white/[0.08] text-xs font-semibold transition-all shadow-sm group"
          >
            <UserPlus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Convidar Aluno (Link/WhatsApp)</span>
          </button>

          <button
            onClick={() => setIsNewStudentModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition-colors shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Manualmente</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between font-sans">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950/60 border border-white/[0.08] text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/60 p-1 rounded-xl border border-white/[0.08] text-xs">
          <button
            onClick={() => setFilterPayment('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterPayment === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 border border-white/[0.06]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setFilterPayment('EM_DIA')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterPayment === 'EM_DIA'
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Em Dia
          </button>
          <button
            onClick={() => setFilterPayment('VENCE_EM_BREVE')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterPayment === 'VENCE_EM_BREVE'
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Vence em Breve
          </button>
          <button
            onClick={() => setFilterPayment('ATRASADO')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filterPayment === 'ATRASADO'
                ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Atrasados
          </button>
        </div>
      </div>

      {/* Students Cards Grid */}
      {filteredStudents.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-white/[0.08] text-zinc-500 font-sans">
          Nenhum aluno encontrado com os filtros atuais.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-sans">
          {filteredStudents.map((student) => {
            const cleanPhone = student.phone.replace(/\D/g, '');
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Olá ${student.name}! Como estão os treinos?`)}`;
            const latestWeight = student.measurements[student.measurements.length - 1]?.weightKg;

            return (
              <div
                key={student.id}
                className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/[0.06] hover:border-white/12 p-5 shadow-2xl shadow-black/40 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Top user row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={student.avatarUrl}
                        alt={student.name}
                        className="w-11 h-11 rounded-full object-cover ring-2 ring-white/10"
                      />
                      <div>
                        <h3 className="font-semibold text-zinc-100 text-base leading-tight">
                          {student.name}
                        </h3>
                        <p className="text-xs text-zinc-400 truncate max-w-[180px]">
                          {student.email}
                        </p>
                      </div>
                    </div>

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
                        ? 'Em Dia'
                        : student.paymentStatus === 'VENCE_EM_BREVE'
                        ? 'Vence Breve'
                        : 'Atrasado'}
                    </Badge>
                  </div>

                  {/* Primary goal */}
                  <div className="mb-3 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs">
                    <span className="text-slate-400">Objetivo: </span>
                    <span className="text-emerald-300 font-semibold">{student.primaryGoal}</span>
                  </div>

                  {/* Badges / stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center py-2.5 border-y border-slate-800/80 text-xs font-mono mb-4">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Treinos</span>
                      <span className="font-bold text-white flex items-center justify-center gap-1">
                        <Dumbbell className="w-3 h-3 text-emerald-400" />
                        {student.workouts.length} rotinas
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Streak</span>
                      <span className="font-bold text-amber-400 flex items-center justify-center gap-1">
                        <Flame className="w-3 h-3" />
                        {student.streakDays}d
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase">Peso Atual</span>
                      <span className="font-bold text-sky-400">
                        {latestWeight ? `${latestWeight} kg` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => setActiveModalStudent(student)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <span>Ficha Completa</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {onOpenChat && (
                    <button
                      onClick={() => onOpenChat(student.id)}
                      className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-colors"
                      title="Abrir Chat Interno com este aluno"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Detalhes do Aluno Selecionado */}
      <StudentDetailModal
        student={activeModalStudent}
        isOpen={!!activeModalStudent}
        onClose={() => setActiveModalStudent(null)}
        onOpenChat={onOpenChat}
      />


      {/* Modal: Novo Aluno */}
      <Modal
        isOpen={isNewStudentModalOpen}
        onClose={() => setIsNewStudentModalOpen(false)}
        title="Cadastrar Novo Aluno"
        subtitle="Preencha os dados de contato, contrato e objetivo"
      >
        <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mariana Silva"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="mariana@gmail.com"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">WhatsApp (com DDD)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="5511988887777"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Plano</label>
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
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Dia do Vencimento</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Objetivo Principal</label>
            <input
              type="text"
              value={primaryGoal}
              onChange={(e) => setPrimaryGoal(e.target.value)}
              placeholder="Ex: Emagrecimento, Hipertrofia, Fortalecimento..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 font-semibold mb-1">Observações Iniciais / Anamnese</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Histórico de lesão no joelho, rotina corrida..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewStudentModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
            >
              Confirmar Cadastro
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Convidar Aluno com Link / WhatsApp */}
      <InviteStudentModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
};
