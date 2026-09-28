import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Student,
  PersonalProfile,
  SessionSchedule,
  Invoice,
  WorkoutRoutine,
  MeasurementRecord,
  SessionStatus,
  ChatMessage,
  ChatMedia,
  StudentStatus,
  PlanType,
  PaymentStatus
} from '../types';
import {
  INITIAL_PERSONAL_PROFILE,
  INITIAL_STUDENTS,
  INITIAL_SESSIONS,
  INITIAL_INVOICES,
  INITIAL_CHAT_MESSAGES,
  MONTHLY_FINANCIAL_HISTORY
} from '../data/mockData';
import { useAuth } from './AuthContext';

interface AppDataContextType {
  personal: PersonalProfile;
  students: Student[];
  sessions: SessionSchedule[];
  invoices: Invoice[];
  messages: ChatMessage[];
  financialHistory: typeof MONTHLY_FINANCIAL_HISTORY;
  isDemoMode: boolean;
  isLoadingData: boolean;
  addStudent: (student: Omit<Student, 'id' | 'streakDays' | 'workouts' | 'measurements'>) => Promise<void>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (studentId: string) => Promise<void>;
  getStudentById: (id: string) => Student | undefined;
  addWorkoutRoutine: (studentId: string, routine: Omit<WorkoutRoutine, 'id'>) => Promise<void>;
  updateWorkoutRoutine: (studentId: string, routine: WorkoutRoutine) => Promise<void>;
  deleteWorkoutRoutine: (studentId: string, routineId: string) => Promise<void>;
  toggleExerciseCompletion: (studentId: string, routineId: string, exerciseId: string) => Promise<void>;
  addMeasurement: (studentId: string, measurement: Omit<MeasurementRecord, 'id'>) => Promise<void>;
  addSession: (session: Omit<SessionSchedule, 'id'>) => Promise<void>;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => Promise<void>;
  markInvoicePaid: (invoiceId: string) => Promise<void>;
  updatePersonalProfile: (profile: Partial<PersonalProfile>) => Promise<void>;
  sendMessage: (studentId: string, senderRole: 'PERSONAL' | 'STUDENT', content: string, category?: ChatMessage['category'], media?: ChatMedia) => Promise<void>;
  markMessagesAsRead: (studentId: string, readerRole: 'PERSONAL' | 'STUDENT') => Promise<void>;
  getUnreadCountForPersonal: () => number;
  getUnreadCountForStudent: (studentId: string) => number;
  resetToDemoData: () => void;
}

const STORAGE_KEY = 'fitcoach_app_data_v3';

async function syncNeonData(payload: any) {
  try {
    let res = await fetch('/api/app-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => null);

    if (!res || res.status === 404) {
      res = await fetch('/fitcoach/api/app-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);
    }
    return res ? await res.json().catch(() => null) : null;
  } catch (err) {
    console.warn('[AppDataContext] Falha ao sincronizar com Neon:', err);
    return null;
  }
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Verifica se o usuário atual é o perfil demonstrativo
  const isDemoMode = Boolean(
    !user ||
    user.email === 'teste@fitcoach.com.br' ||
    user.email === 'demo@fitcoach.com.br'
  );

  useEffect(() => {
    if (user && user.email !== 'teste@fitcoach.com.br' && user.email !== 'demo@fitcoach.com.br') {
      localStorage.removeItem('fitcoach_demo_mode');
    }
  }, [user]);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(!isDemoMode);

  const [personal, setPersonal] = useState<PersonalProfile>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_personal');
      return saved ? JSON.parse(saved) : INITIAL_PERSONAL_PROFILE;
    }
    const savedAuth = typeof localStorage !== 'undefined' ? localStorage.getItem('fitcoach_auth_session') : null;
    let realName = user?.user_metadata?.name;
    let realEmail = user?.email;
    if (!realName && savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        if (parsed.user?.name) realName = parsed.user.name;
        if (parsed.user?.email) realEmail = parsed.user.email;
      } catch {}
    }
    return {
      id: user?.id || 'personal-temp',
      name: realName || 'Personal Trainer',
      title: 'Personal Trainer & Consultor',
      email: realEmail || '',
      phone: user?.user_metadata?.phone || '',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
      pixKey: '',
      pixType: 'EMAIL',
      cref: 'Não informado',
      bio: '',
    };
  });

  const [students, setStudents] = useState<Student[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_students');
      return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
    }
    return [];
  });

  const [sessions, setSessions] = useState<SessionSchedule[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_sessions');
      return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
    }
    return [];
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_invoices');
      return saved ? JSON.parse(saved) : INITIAL_INVOICES;
    }
    return [];
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_messages');
      return saved ? JSON.parse(saved) : INITIAL_CHAT_MESSAGES;
    }
    return [];
  });

  // Carregar dados reais do Neon Postgres quando o usuário for autenticado
  const loadRealUserData = useCallback(async (userId: string) => {
    try {
      setIsLoadingData(true);

      // 1. Tenta carregar dados consolidados do Neon Postgres
      try {
        let apiRes = await fetch(`/api/app-data?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(user?.email || '')}`).catch(() => null);
        if (!apiRes || apiRes.status === 404) {
          apiRes = await fetch(`/fitcoach/api/app-data?userId=${encodeURIComponent(userId)}&email=${encodeURIComponent(user?.email || '')}`).catch(() => null);
        }

        if (apiRes && apiRes.ok) {
          const data = await apiRes.json();
          const profile = data.profile;
          const personalProfile = data.personalProfile;

          if (profile) {
            setPersonal({
              id: profile.id,
              name: profile.name || user?.user_metadata?.name || 'Personal Trainer',
              title: personalProfile?.title || 'Personal Trainer & Consultor',
              email: profile.email || user?.email || '',
              phone: profile.phone || '',
              avatarUrl: profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
              pixKey: personalProfile?.pix_key || '',
              pixType: (personalProfile?.pix_type as any) || 'EMAIL',
              cref: personalProfile?.cref || 'Não informado',
              bio: personalProfile?.bio || '',
            });
          }

          const mappedStudents: Student[] = (data.students || []).map((s: any) => ({
            id: s.id,
            userId: s.user_id,
            name: s.name,
            email: s.email,
            phone: s.phone || '',
            avatarUrl: s.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
            status: s.status as StudentStatus,
            plan: s.plan as PlanType,
            monthlyFee: Number(s.monthly_fee) || 250,
            dueDay: s.due_day || 10,
            paymentStatus: s.payment_status as PaymentStatus,
            startDate: s.start_date || new Date().toISOString().split('T')[0],
            primaryGoal: s.primary_goal || 'Hipertrofia & Força',
            streakDays: s.streak_days || 0,
            notes: s.notes || '',
            workouts: [],
            measurements: [],
          }));
          setStudents(mappedStudents);

          const mappedSessions: SessionSchedule[] = (data.sessions || []).map((sess: any) => {
            const student = (mappedStudents || []).find((s) => s.id === sess.student_id);
            return {
              id: sess.id,
              studentId: sess.student_id,
              studentName: student?.name || 'Aluno',
              date: sess.date,
              time: sess.time,
              durationMinutes: sess.duration_minutes || 60,
              location: sess.location || 'SmartFit',
              status: sess.status,
              workoutRoutineId: sess.workout_routine_id,
              routineName: sess.routine_name,
            };
          });
          setSessions(mappedSessions);

          const mappedInvoices: Invoice[] = (data.invoices || []).map((inv: any) => {
            const student = (mappedStudents || []).find((s) => s.id === inv.student_id);
            return {
              id: inv.id,
              studentId: inv.student_id,
              studentName: student?.name || 'Aluno',
              amount: Number(inv.amount) || 0,
              dueDate: inv.due_date,
              paidDate: inv.paid_date,
              status: inv.status,
              paymentMethod: inv.payment_method,
            };
          });
          setInvoices(mappedInvoices);

          const mappedMessages: ChatMessage[] = (data.messages || []).map((m: any) => {
            let parsedContent = m.content;
            let parsedMedia: ChatMedia | undefined = undefined;
            if (typeof m.content === 'string' && m.content.startsWith('__FC_MEDIA__')) {
              try {
                const parsed = JSON.parse(m.content.substring(12));
                parsedContent = parsed.text || '';
                parsedMedia = parsed.media;
              } catch (e) {
                parsedContent = m.content;
              }
            }
            return {
              id: m.id,
              senderRole: m.sender_role,
              senderId: m.sender_id,
              senderName: m.sender_name,
              studentId: m.student_id,
              content: parsedContent,
              media: parsedMedia,
              timestamp: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
              read: m.read,
              category: m.category,
            };
          });
          setMessages(mappedMessages);
          setIsLoadingData(false);
          return;
        }
      } catch (neonErr) {
        console.warn('[AppDataContext] Erro ao carregar do Neon via /api/app-data:', neonErr);
      } finally {
        setIsLoadingData(false);
      }
      return;
    } catch (err) {
      console.error('[AppDataContext] Erro ao carregar dados:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (isDemoMode) {
      const savedPersonal = localStorage.getItem(STORAGE_KEY + '_personal');
      const savedStudents = localStorage.getItem(STORAGE_KEY + '_students');
      const savedSessions = localStorage.getItem(STORAGE_KEY + '_sessions');
      const savedInvoices = localStorage.getItem(STORAGE_KEY + '_invoices');
      const savedMessages = localStorage.getItem(STORAGE_KEY + '_messages');

      setPersonal(savedPersonal ? JSON.parse(savedPersonal) : INITIAL_PERSONAL_PROFILE);
      setStudents(savedStudents ? JSON.parse(savedStudents) : INITIAL_STUDENTS);
      setSessions(savedSessions ? JSON.parse(savedSessions) : INITIAL_SESSIONS);
      setInvoices(savedInvoices ? JSON.parse(savedInvoices) : INITIAL_INVOICES);
      setMessages(savedMessages ? JSON.parse(savedMessages) : INITIAL_CHAT_MESSAGES);
      setIsLoadingData(false);
    } else if (user?.id) {
      loadRealUserData(user.id);
    }
  }, [isDemoMode, user?.id, loadRealUserData]);

  // Sync state changes with localStorage APENAS em modo demonstrativo
  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEY + '_personal', JSON.stringify(personal));
    }
  }, [personal, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEY + '_students', JSON.stringify(students));
    }
  }, [students, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEY + '_sessions', JSON.stringify(sessions));
    }
  }, [sessions, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEY + '_invoices', JSON.stringify(invoices));
    }
  }, [invoices, isDemoMode]);

  useEffect(() => {
    if (isDemoMode) {
      localStorage.setItem(STORAGE_KEY + '_messages', JSON.stringify(messages));
    }
  }, [messages, isDemoMode]);

  const getStudentById = (id: string) => {
    return students.find(s => s.id === id);
  };

  const addStudent = async (studentData: Omit<Student, 'id' | 'streakDays' | 'workouts' | 'measurements'>) => {
    let newId = `student-${Date.now()}`;
    const initialWorkouts: WorkoutRoutine[] = [
      {
        id: `w-${Date.now()}`,
        name: 'Treino A - Adaptação Inicial',
        focus: 'Familiarização com movimentos básicos',
        exercises: [
          { id: `e-${Date.now()}-1`, name: 'Agachamento com Peso Corporal', muscleGroup: 'Pernas', sets: 3, reps: '12 a 15', load: 'Livre', notes: 'Focar na postura e respiração' },
          { id: `e-${Date.now()}-2`, name: 'Puxada Frontal Leve', muscleGroup: 'Costas', sets: 3, reps: '12', load: '20 kg', notes: 'Manter peito aberto' },
          { id: `e-${Date.now()}-3`, name: 'Flexão com Joelhos Apoiados', muscleGroup: 'Peitoral', sets: 3, reps: '10', load: 'Livre', notes: 'Ativar bem o abdômen' }
        ]
      }
    ];

    if (!isDemoMode && user) {
      try {
        const result = await syncNeonData({
          action: 'ADD_STUDENT',
          personalId: user.id,
          student: studentData,
        });

        if (result?.student?.id) {
          newId = result.student.id;
          await syncNeonData({
            action: 'ADD_WORKOUT',
            studentId: newId,
            personalId: user.id,
            name: initialWorkouts[0].name,
            focus: initialWorkouts[0].focus,
            exercises: initialWorkouts[0].exercises,
          });
        }
      } catch (err) {
        console.error('[AppDataContext] Falha ao persistir aluno no Neon:', err);
      }
    }

    const newStudent: Student = {
      ...studentData,
      id: newId,
      streakDays: 0,
      workouts: initialWorkouts,
      measurements: []
    };

    setStudents(prev => [newStudent, ...prev]);

    // Cria a primeira fatura correspondente
    const today = new Date();
    const dueDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(studentData.dueDay).padStart(2, '0')}`;
    let invId = `inv-${Date.now()}`;

    if (!isDemoMode && user) {
      try {
        const invRes = await syncNeonData({
          action: 'ADD_INVOICE',
          studentId: newId,
          personalId: user.id,
          invoice: {
            amount: studentData.monthlyFee,
            dueDate: dueDateStr,
            status: studentData.paymentStatus === 'EM_DIA' ? 'PAGO' : 'PENDENTE',
            paidDate: studentData.paymentStatus === 'EM_DIA' ? new Date().toISOString().split('T')[0] : null,
            paymentMethod: 'PIX',
          },
        });
        if (invRes?.invoice?.id) invId = invRes.invoice.id;
      } catch (err) {
        console.warn('Erro ao criar fatura no Neon:', err);
      }
    }

    const newInvoice: Invoice = {
      id: invId,
      studentId: newStudent.id,
      studentName: newStudent.name,
      amount: newStudent.monthlyFee,
      dueDate: dueDateStr,
      status: studentData.paymentStatus === 'EM_DIA' ? 'PAGO' : 'PENDENTE',
      paidDate: studentData.paymentStatus === 'EM_DIA' ? new Date().toISOString().split('T')[0] : undefined,
      paymentMethod: studentData.paymentStatus === 'EM_DIA' ? 'PIX' : undefined
    };
    setInvoices(prev => [newInvoice, ...prev]);

    // Mensagem inicial de boas-vindas do coach
    const welcomeMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderRole: 'PERSONAL',
      senderId: personal.id,
      senderName: personal.name,
      studentId: newStudent.id,
      content: `Olá ${newStudent.name.split(' ')[0]}! Seja muito bem-vindo ao seu acompanhamento com o FitCoach. Já montei sua ficha inicial de adaptação. Qualquer dúvida estou à disposição por aqui!`,
      timestamp: 'Hoje ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      category: 'GERAL'
    };
    setMessages(prev => [...prev, welcomeMsg]);
  };

  const updateStudent = async (updatedStudent: Student) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'UPDATE_STUDENT',
        studentId: updatedStudent.id,
        student: updatedStudent,
      });
    }
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const deleteStudent = async (studentId: string) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'DELETE_STUDENT',
        studentId,
      });
    }
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setSessions(prev => prev.filter(s => s.studentId !== studentId));
    setInvoices(prev => prev.filter(i => i.studentId !== studentId));
    setMessages(prev => prev.filter(m => m.studentId !== studentId));
  };

  const addWorkoutRoutine = async (studentId: string, routineData: Omit<WorkoutRoutine, 'id'>) => {
    let newId = `w-${Date.now()}`;
    if (!isDemoMode && user) {
      const res = await syncNeonData({
        action: 'ADD_WORKOUT',
        studentId,
        personalId: user.id,
        name: routineData.name,
        focus: routineData.focus,
        exercises: routineData.exercises,
      });
      if (res?.workout?.id) newId = res.workout.id;
    }

    const newRoutine: WorkoutRoutine = {
      ...routineData,
      id: newId
    };

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: [...student.workouts, newRoutine]
      };
    }));
  };

  const updateWorkoutRoutine = async (studentId: string, routine: WorkoutRoutine) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'UPDATE_WORKOUT',
        routineId: routine.id,
        name: routine.name,
        focus: routine.focus,
        exercises: routine.exercises,
      });
    }

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.map(w => w.id === routine.id ? routine : w)
      };
    }));
  };

  const deleteWorkoutRoutine = async (studentId: string, routineId: string) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'DELETE_WORKOUT',
        routineId,
      });
    }

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.filter(w => w.id !== routineId)
      };
    }));
  };

  const toggleExerciseCompletion = async (studentId: string, routineId: string, exerciseId: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.map(w => {
          if (w.id !== routineId) return w;
          const updatedExercises = w.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            return { ...ex, completed: !ex.completed };
          });
          if (!isDemoMode && user) {
            syncNeonData({
              action: 'UPDATE_WORKOUT',
              routineId,
              exercises: updatedExercises,
            }).catch(() => null);
          }
          return {
            ...w,
            exercises: updatedExercises
          };
        })
      };
    }));
  };

  const addMeasurement = async (studentId: string, measurementData: Omit<MeasurementRecord, 'id'>) => {
    let newId = `m-${Date.now()}`;
    if (!isDemoMode && user) {
      const res = await syncNeonData({
        action: 'ADD_ASSESSMENT',
        studentId,
        personalId: user.id,
        assessment: measurementData,
      });
      if (res?.assessment?.id) newId = res.assessment.id;
    }

    const newMeasurement: MeasurementRecord = {
      ...measurementData,
      id: newId
    };

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        measurements: [...student.measurements, newMeasurement]
      };
    }));
  };

  const addSession = async (sessionData: Omit<SessionSchedule, 'id'>) => {
    let newId = `sess-${Date.now()}`;
    if (!isDemoMode && user) {
      const res = await syncNeonData({
        action: 'ADD_SESSION',
        studentId: sessionData.studentId,
        personalId: user.id,
        session: sessionData,
      });
      if (res?.session?.id) newId = res.session.id;
    }

    const newSession: SessionSchedule = {
      ...sessionData,
      id: newId
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const updateSessionStatus = async (sessionId: string, status: SessionStatus) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'UPDATE_SESSION_STATUS',
        sessionId,
        status,
      });
    }
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
  };

  const markInvoicePaid = async (invoiceId: string) => {
    let studentIdToUpdate: string | undefined;

    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'UPDATE_INVOICE_STATUS',
        invoiceId,
        status: 'PAGO',
        paidDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'PIX',
      });
    }

    setInvoices(prev => prev.map(inv => {
      if (inv.id === invoiceId) {
        studentIdToUpdate = inv.studentId;
        return {
          ...inv,
          status: 'PAGO',
          paidDate: new Date().toISOString().split('T')[0],
          paymentMethod: 'PIX'
        };
      }
      return inv;
    }));

    if (studentIdToUpdate) {
      if (!isDemoMode && user) {
        await syncNeonData({
          action: 'UPDATE_STUDENT',
          studentId: studentIdToUpdate,
          student: { paymentStatus: 'EM_DIA' },
        });
      }

      setStudents(prev => prev.map(s => {
        if (s.id === studentIdToUpdate) {
          return { ...s, paymentStatus: 'EM_DIA' };
        }
        return s;
      }));
    }
  };

  const updatePersonalProfile = async (profileUpdates: Partial<PersonalProfile>) => {
    if (!isDemoMode && user) {
      await syncNeonData({
        userId: user.id,
        ...profileUpdates,
      });
    }
    setPersonal(prev => ({ ...prev, ...profileUpdates }));
  };

  // Chat CRM Methods
  const sendMessage = async (
    studentId: string,
    senderRole: 'PERSONAL' | 'STUDENT',
    content: string,
    category?: ChatMessage['category'],
    media?: ChatMedia
  ) => {
    const student = students.find(s => s.id === studentId);
    const now = new Date();
    const timeStr = 'Hoje ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    let msgId = `msg-${Date.now()}`;

    // Se houver mídia, serializa o conteúdo para armazenar na coluna content
    const dbContent = media
      ? '__FC_MEDIA__' + JSON.stringify({ text: content, media })
      : content;

    if (!isDemoMode && user) {
      const res = await syncNeonData({
        action: 'SEND_MESSAGE',
        studentId,
        personalId: user.id,
        senderRole,
        senderId: senderRole === 'PERSONAL' ? user.id : studentId,
        senderName: senderRole === 'PERSONAL' ? personal.name : (student?.name || 'Aluno'),
        content: dbContent,
        category: category || 'GERAL',
      });
      if (res?.message?.id) msgId = res.message.id;
    }

    const newMsg: ChatMessage = {
      id: msgId,
      senderRole,
      senderId: senderRole === 'PERSONAL' ? personal.id : studentId,
      senderName: senderRole === 'PERSONAL' ? personal.name : (student?.name || 'Aluno'),
      studentId,
      content,
      media,
      timestamp: timeStr,
      read: false,
      category: category || 'GERAL'
    };

    setMessages(prev => [...prev, newMsg]);
  };

  const markMessagesAsRead = async (studentId: string, readerRole: 'PERSONAL' | 'STUDENT') => {
    const senderRoleToMark = readerRole === 'PERSONAL' ? 'STUDENT' : 'PERSONAL';

    if (!isDemoMode && user) {
      await syncNeonData({
        action: 'MARK_MESSAGES_READ',
        studentId,
        personalId: user.id,
        senderRole: senderRoleToMark,
      });
    }

    setMessages(prev => prev.map(msg => {
      if (msg.studentId === studentId && msg.senderRole === senderRoleToMark && !msg.read) {
        return { ...msg, read: true };
      }
      return msg;
    }));
  };

  const getUnreadCountForPersonal = () => {
    return messages.filter(m => m.senderRole === 'STUDENT' && !m.read).length;
  };

  const getUnreadCountForStudent = (studentId: string) => {
    return messages.filter(m => m.studentId === studentId && m.senderRole === 'PERSONAL' && !m.read).length;
  };

  const resetToDemoData = () => {
    setPersonal(INITIAL_PERSONAL_PROFILE);
    setStudents(INITIAL_STUDENTS);
    setSessions(INITIAL_SESSIONS);
    setInvoices(INITIAL_INVOICES);
    setMessages(INITIAL_CHAT_MESSAGES);
    localStorage.removeItem(STORAGE_KEY + '_personal');
    localStorage.removeItem(STORAGE_KEY + '_students');
    localStorage.removeItem(STORAGE_KEY + '_sessions');
    localStorage.removeItem(STORAGE_KEY + '_invoices');
    localStorage.removeItem(STORAGE_KEY + '_messages');
  };

  return (
    <AppDataContext.Provider
      value={{
        personal,
        students,
        sessions,
        invoices,
        messages,
        financialHistory: MONTHLY_FINANCIAL_HISTORY,
        isDemoMode,
        isLoadingData,
        addStudent,
        updateStudent,
        deleteStudent,
        getStudentById,
        addWorkoutRoutine,
        updateWorkoutRoutine,
        deleteWorkoutRoutine,
        toggleExerciseCompletion,
        addMeasurement,
        addSession,
        updateSessionStatus,
        markInvoicePaid,
        updatePersonalProfile,
        sendMessage,
        markMessagesAsRead,
        getUnreadCountForPersonal,
        getUnreadCountForStudent,
        resetToDemoData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextType => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
