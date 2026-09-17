export type UserRole = 'PERSONAL' | 'STUDENT' | 'MASTER';

export type PlanType = 'MENSAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL';
export type PaymentStatus = 'EM_DIA' | 'VENCE_EM_BREVE' | 'ATRASADO';
export type StudentStatus = 'ATIVO' | 'INATIVO' | 'PENDENTE';
export type SessionStatus = 'AGENDADA' | 'REALIZADA' | 'CANCELADA';
export type InvoiceStatus = 'PAGO' | 'PENDENTE' | 'ATRASADO';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string;
  load: string;
  notes?: string;
  completed?: boolean;
}

export interface WorkoutRoutine {
  id: string;
  name: string; // Ex: "Treino A - Peito e Tríceps"
  focus: string;
  exercises: Exercise[];
}

export interface MeasurementRecord {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  heightCm: number;
  bodyFatPercentage?: number;
  chestCm?: number;
  armsCm?: number;
  waistCm?: number;
  hipsCm?: number;
  thighsCm?: number;
}

export interface SessionSchedule {
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  time: string; // "08:00"
  durationMinutes: number;
  location: string;
  status: SessionStatus;
  workoutRoutineId?: string;
  routineName?: string;
}

export interface ChatMessage {
  id: string;
  senderRole: 'PERSONAL' | 'STUDENT';
  senderId: string;
  senderName: string;
  studentId: string;
  content: string;
  timestamp: string; // HH:mm ou DD/MM HH:mm
  read: boolean;
  category?: 'DUVIDA' | 'AGENDAMENTO' | 'PAGAMENTO' | 'AVALIACAO' | 'GERAL';
}

export interface Student {
  id: string;
  name: string;
  email: string;
  phone: string; // formato para WhatsApp, ex: "5511988887777"
  avatarUrl: string;
  status: StudentStatus;
  plan: PlanType;
  monthlyFee: number;
  dueDay: number; // Dia do mês que vence (1 a 31)
  paymentStatus: PaymentStatus;
  startDate: string;
  primaryGoal: string; // Ex: "Hipertrofia & Força"
  streakDays: number;
  workouts: WorkoutRoutine[];
  measurements: MeasurementRecord[];
  nextAssessmentDate?: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  studentId: string;
  studentName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  paidDate?: string;
  status: InvoiceStatus;
  paymentMethod?: string;
}

export interface PersonalProfile {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string;
  pixKey: string;
  pixType: 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  cref: string;
  bio: string;
}

export interface UserSession {
  role: UserRole;
  currentStudentId?: string; // Se role === 'STUDENT'
}

export type InviteType = 'PERSONAL' | 'STUDENT';
export type InviteStatus = 'PENDENTE' | 'USADO' | 'EXPIRADO' | 'REVOGADO';

export interface Invite {
  id: string;
  code: string;
  type: InviteType;
  createdBy?: string;
  personalId?: string;
  targetName?: string;
  targetEmail?: string;
  plan?: string;
  status: InviteStatus;
  usedBy?: string;
  usedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface InviteValidationResult {
  valid: boolean;
  inviteType?: InviteType;
  targetName?: string;
  targetEmail?: string;
  plan?: string;
  personalId?: string;
  personalName?: string;
}
