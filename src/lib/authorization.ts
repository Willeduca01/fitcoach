import { Student, WorkoutRoutine, Invoice, SessionSchedule, ChatMessage, UserRole } from '../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { isValidUuid } from './security';

/**
 * Utilitários de Autorização e Validação no Nível de Objeto (BOLA / IDOR Defense)
 * Utilizados para validações defensivas no frontend antes de disparar requisições ou renderizar dados.
 */

export interface AuthUserInfo {
  id: string;
  role?: UserRole | string;
  email?: string | null;
}

export type AuthUserTarget = SupabaseUser | AuthUserInfo;

/**
 * Valida se um identificador é seguro (UUID v4 ou identificador mock do sistema)
 */
export function isSafeObjectId(id: string | undefined | null): boolean {
  if (!id) return false;
  const clean = id.trim();
  // Permite UUID v4 ou prefixos válidos de mock/demo (ex: w-12345, inv-12345, sess-12345)
  if (isValidUuid(clean)) return true;
  return /^[a-z]{1,5}-\d{6,20}(?:-\d+)?$/i.test(clean);
}

/**
 * Verifica se o usuário autenticado tem permissão para acessar ou manipular um aluno específico
 */
export function canAccessStudent(
  user: AuthUserTarget | null | undefined,
  targetStudentId: string | undefined | null,
  studentsList: Student[] = []
): boolean {
  if (!user || !targetStudentId) return false;
  const role = (user as any).role || (user as any).user_metadata?.role;
  if (role === 'MASTER') return true;

  if (role === 'PERSONAL') {
    return studentsList.some((s) => s.id === targetStudentId);
  }

  if (role === 'STUDENT') {
    // Aluno só pode acessar o seu próprio studentId
    return user.id === targetStudentId || studentsList.some((s) => s.id === targetStudentId && s.userId === user.id);
  }

  return false;
}

/**
 * Verifica se o usuário tem permissão para visualizar ou alterar uma rotina de treino
 */
export function canAccessWorkout(
  user: AuthUserTarget | null | undefined,
  workout: WorkoutRoutine | undefined | null,
  activeStudentId: string | undefined | null,
  studentsList: Student[] = []
): boolean {
  if (!user || !workout) return false;
  const role = (user as any).role || (user as any).user_metadata?.role;
  if (role === 'MASTER') return true;

  if (role === 'PERSONAL') {
    return studentsList.some((s) => s.workouts?.some((w) => w.id === workout.id));
  }

  if (role === 'STUDENT') {
    const student = studentsList.find((s) => s.id === activeStudentId);
    return Boolean(student?.workouts?.some((w) => w.id === workout.id));
  }

  return false;
}

/**
 * Verifica se o usuário tem permissão para acessar uma fatura
 */
export function canAccessInvoice(
  user: AuthUserTarget | null | undefined,
  invoice: Invoice | undefined | null,
  activeStudentId: string | undefined | null,
  studentsList: Student[] = []
): boolean {
  if (!user || !invoice) return false;
  const role = (user as any).role || (user as any).user_metadata?.role;
  if (role === 'MASTER') return true;

  if (role === 'PERSONAL') {
    return studentsList.some((s) => s.id === invoice.studentId);
  }

  if (role === 'STUDENT') {
    return invoice.studentId === activeStudentId;
  }

  return false;
}

/**
 * Verifica se o usuário tem permissão para acessar uma sessão da agenda
 */
export function canAccessSession(
  user: AuthUserTarget | null | undefined,
  session: SessionSchedule | undefined | null,
  activeStudentId: string | undefined | null,
  studentsList: Student[] = []
): boolean {
  if (!user || !session) return false;
  const role = (user as any).role || (user as any).user_metadata?.role;
  if (role === 'MASTER') return true;

  if (role === 'PERSONAL') {
    return true; // Personal visualiza todas as sessões da sua agenda
  }

  if (role === 'STUDENT') {
    return session.studentId === activeStudentId;
  }

  return false;
}

/**
 * Verifica se o usuário tem permissão para interagir com uma mensagem
 */
export function canAccessMessage(
  user: AuthUserTarget | null | undefined,
  message: ChatMessage | undefined | null,
  activeStudentId: string | undefined | null,
  studentsList: Student[] = []
): boolean {
  if (!user || !message) return false;
  const role = (user as any).role || (user as any).user_metadata?.role;
  if (role === 'MASTER') return true;

  if (role === 'PERSONAL') {
    return studentsList.some((s) => s.id === message.studentId);
  }

  if (role === 'STUDENT') {
    return message.studentId === activeStudentId;
  }

  return false;
}
