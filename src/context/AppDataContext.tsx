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
  ChatMedia
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
import { supabase } from '../lib/supabase';

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

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Verifica se o usuário atual é o perfil demonstrativo
  const isDemoMode =
    !user ||
    user.email === 'teste@fitcoach.com.br' ||
    localStorage.getItem('fitcoach_demo_mode') === 'true';

  const [isLoadingData, setIsLoadingData] = useState<boolean>(!isDemoMode);

  const [personal, setPersonal] = useState<PersonalProfile>(() => {
    if (isDemoMode) {
      const saved = localStorage.getItem(STORAGE_KEY + '_personal');
      return saved ? JSON.parse(saved) : INITIAL_PERSONAL_PROFILE;
    }
    return {
      id: user?.id || 'personal-temp',
      name: user?.user_metadata?.name || 'Personal Trainer',
      title: 'Personal Trainer & Consultor Fitness',
      email: user?.email || '',
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

  // Carregar dados reais do Supabase quando o usuário for um treinador real autenticado
  // Carregar dados reais do Supabase quando o usuário for autenticado
  const loadRealUserData = useCallback(async (userId: string) => {
    try {
      setIsLoadingData(true);

      // 1. Perfil do Usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const isStudent = profile?.role === 'STUDENT';

      let studentsData: any[] = [];
      let studentPersonalId: string | null = null;

      if (isStudent) {
        // Aluno autenticado: busca sua própria ficha por user_id
        let { data: myStudent } = await supabase
          .from('students')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        // Se ainda não estiver vinculado na coluna user_id, vincula via API
        if (!myStudent && user?.email) {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData?.session?.access_token;
            const linkHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) linkHeaders['Authorization'] = `Bearer ${token}`;

            let linkRes = await fetch('/api/link-student', {
              method: 'POST',
              headers: linkHeaders,
              body: JSON.stringify({ userId, email: user.email }),
            }).catch(() => null);

            if (!linkRes || linkRes.status === 404) {
              linkRes = await fetch('/fitcoach/api/link-student', {
                method: 'POST',
                headers: linkHeaders,
                body: JSON.stringify({ userId, email: user.email }),
              }).catch(() => null);
            }

            if (linkRes && linkRes.ok) {
              const { data: refetched } = await supabase
                .from('students')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();
              myStudent = refetched;
            }
          } catch (e) {
            console.warn('[AppDataContext] Falha ao vincular aluno automaticamente:', e);
          }
        }

        if (myStudent) {
          studentsData = [myStudent];
          studentPersonalId = myStudent.personal_id;

          // Busca dados do Personal Trainer do aluno para preencher o perfil do treinador
          if (studentPersonalId) {
            const { data: trainerProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', studentPersonalId)
              .maybeSingle();

            const { data: trainerPersonal } = await supabase
              .from('personal_profiles')
              .select('*')
              .eq('id', studentPersonalId)
              .maybeSingle();

            if (trainerProfile) {
              setPersonal({
                id: studentPersonalId,
                name: trainerProfile.name || 'Personal Trainer',
                title: trainerPersonal?.title || 'Personal Trainer & Consultor Fitness',
                email: trainerProfile.email || '',
                phone: trainerProfile.phone || '',
                avatarUrl: trainerProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
                pixKey: trainerPersonal?.pix_key || '',
                pixType: (trainerPersonal?.pix_type as any) || 'EMAIL',
                cref: trainerPersonal?.cref || 'Não informado',
                bio: trainerPersonal?.bio || '',
              });
            }
          }
        }
      } else {
        // Usuário é Personal Trainer ou Master: busca perfil profissional
        const { data: personalProfile } = await supabase
          .from('personal_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (profile) {
          setPersonal({
            id: userId,
            name: profile.name || user?.user_metadata?.name || 'Personal Trainer',
            title: personalProfile?.title || 'Personal Trainer & Consultor Fitness',
            email: profile.email || user?.email || '',
            phone: profile.phone || '',
            avatarUrl: profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
            pixKey: personalProfile?.pix_key || '',
            pixType: (personalProfile?.pix_type as any) || 'EMAIL',
            cref: personalProfile?.cref || 'Não informado',
            bio: personalProfile?.bio || '',
          });
        }

        // Busca todos os alunos deste treinador
        const { data: trainerStudents } = await supabase
          .from('students')
          .select('*')
          .eq('personal_id', userId)
          .order('created_at', { ascending: false });

        studentsData = trainerStudents || [];
      }

      const activeStudentId = isStudent ? studentsData[0]?.id : null;

      // Treinos e Avaliações
      const workoutsQuery = isStudent && activeStudentId
        ? supabase.from('workouts').select('*').eq('student_id', activeStudentId)
        : supabase.from('workouts').select('*').eq('personal_id', userId);
      const { data: workoutsData } = await workoutsQuery;

      const assessmentsQuery = isStudent && activeStudentId
        ? supabase.from('physical_assessments').select('*').eq('student_id', activeStudentId)
        : supabase.from('physical_assessments').select('*').eq('personal_id', userId);
      const { data: assessmentsData } = await assessmentsQuery;

      const mappedStudents: Student[] = studentsData.map((s) => ({
        id: s.id,
        userId: s.user_id || undefined,
        name: s.name,
        email: s.email || '',
        phone: s.phone || '',
        avatarUrl: s.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300',
        status: s.status,
        plan: s.plan,
        monthlyFee: Number(s.monthly_fee) || 0,
        dueDay: s.due_day || 10,
        paymentStatus: s.payment_status || 'EM_DIA',
        startDate: s.start_date || new Date().toISOString().split('T')[0],
        primaryGoal: s.primary_goal || 'Condicionamento Físico',
        streakDays: s.streak_days || 0,
        workouts: (workoutsData || [])
          .filter((w) => w.student_id === s.id)
          .map((w) => ({
            id: w.id,
            name: w.name,
            focus: w.focus,
            exercises: Array.isArray(w.exercises) ? w.exercises : [],
          })),
        measurements: (assessmentsData || [])
          .filter((a) => a.student_id === s.id)
          .map((a) => ({
            id: a.id,
            date: a.date,
            weightKg: Number(a.weight_kg),
            heightCm: Number(a.height_cm),
            bodyFatPercentage: a.body_fat_percentage ? Number(a.body_fat_percentage) : undefined,
            chestCm: a.chest_cm ? Number(a.chest_cm) : undefined,
            armsCm: a.arms_cm ? Number(a.arms_cm) : undefined,
            waistCm: a.waist_cm ? Number(a.waist_cm) : undefined,
            hipsCm: a.hips_cm ? Number(a.hips_cm) : undefined,
            thighsCm: a.thighs_cm ? Number(a.thighs_cm) : undefined,
          })),
        nextAssessmentDate: s.next_assessment_date,
        notes: s.notes,
      }));

      setStudents(mappedStudents);

      // 3. Faturas
      const invoicesQuery = isStudent && activeStudentId
        ? supabase.from('invoices').select('*').eq('student_id', activeStudentId).order('due_date', { ascending: false })
        : supabase.from('invoices').select('*').eq('personal_id', userId).order('due_date', { ascending: false });
      const { data: invoicesData } = await invoicesQuery;

      const mappedInvoices: Invoice[] = (invoicesData || []).map((inv) => {
        const student = (studentsData || []).find((s) => s.id === inv.student_id);
        return {
          id: inv.id,
          studentId: inv.student_id,
          studentName: student?.name || 'Aluno',
          amount: Number(inv.amount) || 0,
          dueDate: inv.due_date,
          paidDate: inv.paid_date,
          status: inv.status,
          paymentMethod: inv.payment_method || 'PIX',
        };
      });
      setInvoices(mappedInvoices);

      // 4. Sessões
      const sessionsQuery = isStudent && activeStudentId
        ? supabase.from('sessions').select('*').eq('student_id', activeStudentId).order('date', { ascending: true })
        : supabase.from('sessions').select('*').eq('personal_id', userId).order('date', { ascending: true });
      const { data: sessionsData } = await sessionsQuery;

      const mappedSessions: SessionSchedule[] = (sessionsData || []).map((sess) => {
        const student = (studentsData || []).find((s) => s.id === sess.student_id);
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

      // 5. Mensagens
      const messagesQuery = isStudent && activeStudentId
        ? supabase.from('messages').select('*').eq('student_id', activeStudentId).order('created_at', { ascending: true })
        : supabase.from('messages').select('*').eq('personal_id', userId).order('created_at', { ascending: true });
      const { data: messagesData } = await messagesQuery;

      const mappedMessages: ChatMessage[] = (messagesData || []).map((m) => {
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
    } catch (err) {
      console.error('[AppDataContext] Erro ao carregar dados do Supabase:', err);
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
        const { data, error } = await supabase.from('students').insert({
          personal_id: user.id,
          name: studentData.name,
          email: studentData.email || null,
          phone: studentData.phone || null,
          avatar_url: studentData.avatarUrl || null,
          status: studentData.status || 'ATIVO',
          plan: studentData.plan || 'MENSAL',
          monthly_fee: studentData.monthlyFee || 0,
          due_day: studentData.dueDay || 10,
          payment_status: studentData.paymentStatus || 'EM_DIA',
          start_date: studentData.startDate || new Date().toISOString().split('T')[0],
          primary_goal: studentData.primaryGoal || 'Condicionamento Físico',
          notes: studentData.notes || null,
        }).select().single();

        if (error) {
          console.error('[AppDataContext] Erro ao cadastrar aluno no Supabase:', error);
        } else if (data) {
          newId = data.id;
          await supabase.from('workouts').insert({
            student_id: newId,
            personal_id: user.id,
            name: initialWorkouts[0].name,
            focus: initialWorkouts[0].focus,
            exercises: initialWorkouts[0].exercises,
          });
        }
      } catch (err) {
        console.error('[AppDataContext] Falha ao persistir aluno:', err);
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
        const { data: invData } = await supabase.from('invoices').insert({
          student_id: newId,
          personal_id: user.id,
          amount: studentData.monthlyFee,
          due_date: dueDateStr,
          status: studentData.paymentStatus === 'EM_DIA' ? 'PAGO' : 'PENDENTE',
          paid_date: studentData.paymentStatus === 'EM_DIA' ? new Date().toISOString().split('T')[0] : null,
          payment_method: 'PIX',
        }).select().single();
        if (invData) invId = invData.id;
      } catch (err) {
        console.warn('Erro ao criar fatura:', err);
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
      try {
        await supabase.from('students').update({
          name: updatedStudent.name,
          email: updatedStudent.email,
          phone: updatedStudent.phone,
          avatar_url: updatedStudent.avatarUrl,
          status: updatedStudent.status,
          plan: updatedStudent.plan,
          monthly_fee: updatedStudent.monthlyFee,
          due_day: updatedStudent.dueDay,
          payment_status: updatedStudent.paymentStatus,
          primary_goal: updatedStudent.primaryGoal,
          notes: updatedStudent.notes,
        }).eq('id', updatedStudent.id);
      } catch (err) {
        console.error('Erro ao atualizar aluno:', err);
      }
    }
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const deleteStudent = async (studentId: string) => {
    if (!isDemoMode && user) {
      try {
        await supabase.from('students').delete().eq('id', studentId);
      } catch (err) {
        console.error('Erro ao excluir aluno:', err);
      }
    }
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setSessions(prev => prev.filter(s => s.studentId !== studentId));
    setInvoices(prev => prev.filter(i => i.studentId !== studentId));
    setMessages(prev => prev.filter(m => m.studentId !== studentId));
  };

  const addWorkoutRoutine = async (studentId: string, routineData: Omit<WorkoutRoutine, 'id'>) => {
    let newId = `w-${Date.now()}`;
    if (!isDemoMode && user) {
      try {
        const { data } = await supabase.from('workouts').insert({
          student_id: studentId,
          personal_id: user.id,
          name: routineData.name,
          focus: routineData.focus,
          exercises: routineData.exercises,
        }).select().single();
        if (data) newId = data.id;
      } catch (err) {
        console.error('Erro ao adicionar treino:', err);
      }
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
      try {
        await supabase.from('workouts').update({
          name: routine.name,
          focus: routine.focus,
          exercises: routine.exercises,
        }).eq('id', routine.id);
      } catch (err) {
        console.error('Erro ao atualizar treino:', err);
      }
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
      try {
        await supabase.from('workouts').delete().eq('id', routineId);
      } catch (err) {
        console.error('Erro ao excluir treino:', err);
      }
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
            supabase.from('workouts').update({ exercises: updatedExercises }).eq('id', routineId).then();
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
      try {
        const { data } = await supabase.from('physical_assessments').insert({
          student_id: studentId,
          personal_id: user.id,
          date: measurementData.date,
          weight_kg: measurementData.weightKg,
          height_cm: measurementData.heightCm,
          body_fat_percentage: measurementData.bodyFatPercentage || null,
          chest_cm: measurementData.chestCm || null,
          arms_cm: measurementData.armsCm || null,
          waist_cm: measurementData.waistCm || null,
          hips_cm: measurementData.hipsCm || null,
          thighs_cm: measurementData.thighsCm || null,
        }).select().single();
        if (data) newId = data.id;
      } catch (err) {
        console.error('Erro ao salvar avaliação:', err);
      }
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
      try {
        const { data } = await supabase.from('sessions').insert({
          personal_id: user.id,
          student_id: sessionData.studentId,
          date: sessionData.date,
          time: sessionData.time,
          duration_minutes: sessionData.durationMinutes,
          location: sessionData.location,
          status: sessionData.status,
          workout_routine_id: sessionData.workoutRoutineId || null,
          routine_name: sessionData.routineName || null,
        }).select().single();
        if (data) newId = data.id;
      } catch (err) {
        console.error('Erro ao adicionar sessão:', err);
      }
    }

    const newSession: SessionSchedule = {
      ...sessionData,
      id: newId
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const updateSessionStatus = async (sessionId: string, status: SessionStatus) => {
    if (!isDemoMode && user) {
      try {
        await supabase.from('sessions').update({ status }).eq('id', sessionId);
      } catch (err) {
        console.error('Erro ao atualizar sessão:', err);
      }
    }
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
  };

  const markInvoicePaid = async (invoiceId: string) => {
    let studentIdToUpdate: string | undefined;

    if (!isDemoMode && user) {
      try {
        await supabase.from('invoices').update({
          status: 'PAGO',
          paid_date: new Date().toISOString().split('T')[0],
          payment_method: 'PIX',
        }).eq('id', invoiceId);
      } catch (err) {
        console.error('Erro ao atualizar fatura no banco:', err);
      }
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
        try {
          await supabase.from('students').update({
            payment_status: 'EM_DIA'
          }).eq('id', studentIdToUpdate);
        } catch (err) {
          console.error(err);
        }
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
      try {
        if (profileUpdates.name || profileUpdates.phone || profileUpdates.avatarUrl) {
          await supabase.from('profiles').update({
            ...(profileUpdates.name ? { name: profileUpdates.name } : {}),
            ...(profileUpdates.phone ? { phone: profileUpdates.phone } : {}),
            ...(profileUpdates.avatarUrl ? { avatar_url: profileUpdates.avatarUrl } : {}),
          }).eq('id', user.id);
        }

        await supabase.from('personal_profiles').upsert({
          id: user.id,
          ...(profileUpdates.title ? { title: profileUpdates.title } : {}),
          ...(profileUpdates.cref ? { cref: profileUpdates.cref } : {}),
          ...(profileUpdates.bio ? { bio: profileUpdates.bio } : {}),
          ...(profileUpdates.pixKey ? { pix_key: profileUpdates.pixKey } : {}),
          ...(profileUpdates.pixType ? { pix_type: profileUpdates.pixType } : {}),
        });
      } catch (err) {
        console.error('Erro ao atualizar perfil no Supabase:', err);
      }
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
      try {
        const { data } = await supabase.from('messages').insert({
          personal_id: user.id,
          student_id: studentId,
          sender_role: senderRole,
          sender_id: senderRole === 'PERSONAL' ? user.id : studentId,
          sender_name: senderRole === 'PERSONAL' ? personal.name : (student?.name || 'Aluno'),
          content: dbContent,
          category: category || 'GERAL',
          read: false,
        }).select().single();
        if (data) msgId = data.id;
      } catch (err) {
        console.error('Erro ao enviar mensagem:', err);
      }
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
      try {
        await supabase
          .from('messages')
          .update({ read: true })
          .eq('student_id', studentId)
          .eq('personal_id', user.id)
          .eq('sender_role', senderRoleToMark);
      } catch (err) {
        console.error('Erro ao marcar mensagens como lidas:', err);
      }
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
