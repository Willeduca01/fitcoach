import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Student,
  PersonalProfile,
  SessionSchedule,
  Invoice,
  WorkoutRoutine,
  MeasurementRecord,
  SessionStatus,
  ChatMessage
} from '../types';
import {
  INITIAL_PERSONAL_PROFILE,
  INITIAL_STUDENTS,
  INITIAL_SESSIONS,
  INITIAL_INVOICES,
  INITIAL_CHAT_MESSAGES,
  MONTHLY_FINANCIAL_HISTORY
} from '../data/mockData';

interface AppDataContextType {
  personal: PersonalProfile;
  students: Student[];
  sessions: SessionSchedule[];
  invoices: Invoice[];
  messages: ChatMessage[];
  financialHistory: typeof MONTHLY_FINANCIAL_HISTORY;
  addStudent: (student: Omit<Student, 'id' | 'streakDays' | 'workouts' | 'measurements'>) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (studentId: string) => void;
  getStudentById: (id: string) => Student | undefined;
  addWorkoutRoutine: (studentId: string, routine: Omit<WorkoutRoutine, 'id'>) => void;
  updateWorkoutRoutine: (studentId: string, routine: WorkoutRoutine) => void;
  deleteWorkoutRoutine: (studentId: string, routineId: string) => void;
  toggleExerciseCompletion: (studentId: string, routineId: string, exerciseId: string) => void;
  addMeasurement: (studentId: string, measurement: Omit<MeasurementRecord, 'id'>) => void;
  addSession: (session: Omit<SessionSchedule, 'id'>) => void;
  updateSessionStatus: (sessionId: string, status: SessionStatus) => void;
  markInvoicePaid: (invoiceId: string) => void;
  updatePersonalProfile: (profile: Partial<PersonalProfile>) => void;
  sendMessage: (studentId: string, senderRole: 'PERSONAL' | 'STUDENT', content: string, category?: ChatMessage['category']) => void;
  markMessagesAsRead: (studentId: string, readerRole: 'PERSONAL' | 'STUDENT') => void;
  getUnreadCountForPersonal: () => number;
  getUnreadCountForStudent: (studentId: string) => number;
  resetToDemoData: () => void;
}

const STORAGE_KEY = 'fitcoach_app_data_v3';

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const AppDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [personal, setPersonal] = useState<PersonalProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_personal');
    return saved ? JSON.parse(saved) : INITIAL_PERSONAL_PROFILE;
  });

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_students');
    return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
  });

  const [sessions, setSessions] = useState<SessionSchedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_sessions');
    return saved ? JSON.parse(saved) : INITIAL_SESSIONS;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_invoices');
    return saved ? JSON.parse(saved) : INITIAL_INVOICES;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY + '_messages');
    return saved ? JSON.parse(saved) : INITIAL_CHAT_MESSAGES;
  });

  // Sync state changes with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_personal', JSON.stringify(personal));
  }, [personal]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_invoices', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_messages', JSON.stringify(messages));
  }, [messages]);

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

  const getStudentById = (id: string) => {
    return students.find(s => s.id === id);
  };

  const addStudent = (studentData: Omit<Student, 'id' | 'streakDays' | 'workouts' | 'measurements'>) => {
    const newStudent: Student = {
      ...studentData,
      id: `student-${Date.now()}`,
      streakDays: 0,
      workouts: [
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
      ],
      measurements: []
    };

    setStudents(prev => [newStudent, ...prev]);

    // Cria a primeira fatura correspondente
    const today = new Date();
    const dueDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(studentData.dueDay).padStart(2, '0')}`;
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
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

  const updateStudent = (updatedStudent: Student) => {
    setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
  };

  const deleteStudent = (studentId: string) => {
    setStudents(prev => prev.filter(s => s.id !== studentId));
    setSessions(prev => prev.filter(s => s.studentId !== studentId));
    setInvoices(prev => prev.filter(i => i.studentId !== studentId));
    setMessages(prev => prev.filter(m => m.studentId !== studentId));
  };

  const addWorkoutRoutine = (studentId: string, routineData: Omit<WorkoutRoutine, 'id'>) => {
    const newRoutine: WorkoutRoutine = {
      ...routineData,
      id: `w-${Date.now()}`
    };

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: [...student.workouts, newRoutine]
      };
    }));
  };

  const updateWorkoutRoutine = (studentId: string, routine: WorkoutRoutine) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.map(w => w.id === routine.id ? routine : w)
      };
    }));
  };

  const deleteWorkoutRoutine = (studentId: string, routineId: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.filter(w => w.id !== routineId)
      };
    }));
  };

  const toggleExerciseCompletion = (studentId: string, routineId: string, exerciseId: string) => {
    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        workouts: student.workouts.map(w => {
          if (w.id !== routineId) return w;
          return {
            ...w,
            exercises: w.exercises.map(ex => {
              if (ex.id !== exerciseId) return ex;
              return { ...ex, completed: !ex.completed };
            })
          };
        })
      };
    }));
  };

  const addMeasurement = (studentId: string, measurementData: Omit<MeasurementRecord, 'id'>) => {
    const newMeasurement: MeasurementRecord = {
      ...measurementData,
      id: `m-${Date.now()}`
    };

    setStudents(prev => prev.map(student => {
      if (student.id !== studentId) return student;
      return {
        ...student,
        measurements: [...student.measurements, newMeasurement]
      };
    }));
  };

  const addSession = (sessionData: Omit<SessionSchedule, 'id'>) => {
    const newSession: SessionSchedule = {
      ...sessionData,
      id: `sess-${Date.now()}`
    };
    setSessions(prev => [newSession, ...prev]);
  };

  const updateSessionStatus = (sessionId: string, status: SessionStatus) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, status } : s));
  };

  const markInvoicePaid = (invoiceId: string) => {
    let studentIdToUpdate: string | undefined;

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
      setStudents(prev => prev.map(s => {
        if (s.id === studentIdToUpdate) {
          return { ...s, paymentStatus: 'EM_DIA' };
        }
        return s;
      }));
    }
  };

  const updatePersonalProfile = (profileUpdates: Partial<PersonalProfile>) => {
    setPersonal(prev => ({ ...prev, ...profileUpdates }));
  };

  // Chat CRM Methods
  const sendMessage = (
    studentId: string,
    senderRole: 'PERSONAL' | 'STUDENT',
    content: string,
    category?: ChatMessage['category']
  ) => {
    const student = students.find(s => s.id === studentId);
    const now = new Date();
    const timeStr = 'Hoje ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderRole,
      senderId: senderRole === 'PERSONAL' ? personal.id : studentId,
      senderName: senderRole === 'PERSONAL' ? personal.name : (student?.name || 'Aluno'),
      studentId,
      content,
      timestamp: timeStr,
      read: false,
      category: category || 'GERAL'
    };

    setMessages(prev => [...prev, newMsg]);
  };

  const markMessagesAsRead = (studentId: string, readerRole: 'PERSONAL' | 'STUDENT') => {
    // Se quem está lendo é o PERSONAL, marca como lidas as mensagens enviadas por STUDENT
    // Se quem está lendo é o STUDENT, marca como lidas as mensagens enviadas por PERSONAL
    const senderRoleToMark = readerRole === 'PERSONAL' ? 'STUDENT' : 'PERSONAL';

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

  return (
    <AppDataContext.Provider
      value={{
        personal,
        students,
        sessions,
        invoices,
        messages,
        financialHistory: MONTHLY_FINANCIAL_HISTORY,
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
