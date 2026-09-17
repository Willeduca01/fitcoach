import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { supabase, validateInviteCode } from '../lib/supabase';
import type { User as SupabaseUser, Session as SupabaseSession } from '@supabase/supabase-js';

interface AuthContextType {
  role: UserRole | null;
  currentStudentId: string | null;
  user: SupabaseUser | null;
  session: SupabaseSession | null;
  loading: boolean;
  loginAsPersonal: () => void;
  loginAsStudent: (studentId: string) => void;
  loginWithPassword: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  signUpWithInviteCode: (params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    inviteCode: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole, studentId?: string) => void;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'fitcoach_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.role || null;
      } catch {
        return null;
      }
    }
    return null; // Inicialmente deslogado para exibir a tela de login
  });

  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentStudentId || null;
      } catch {
        return null;
      }
    }
    return null;
  });

  // Monitorar autenticação do Supabase
  useEffect(() => {
    // 1. Pega a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        syncUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // 2. Escuta mudanças de auth (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await syncUserProfile(newSession.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Busca perfil no banco para definir a Role correta
  const syncUserProfile = async (userId: string): Promise<UserRole | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, name')
        .eq('id', userId)
        .maybeSingle();

      if (!error && profile) {
        const userRole = profile.role as UserRole;
        setRole(userRole);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: userRole, currentStudentId: null }));

        if (userRole === 'STUDENT') {
          // Busca o id do estudante na tabela students
          const { data: studentRecord } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (studentRecord) {
            setCurrentStudentId(studentRecord.id);
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: userRole, currentStudentId: studentRecord.id }));
          }
        }
        return userRole;
      }
      return null;
    } catch (err) {
      console.warn('[AuthContext] Erro ao sincronizar perfil:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (role) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, currentStudentId }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [role, currentStudentId]);

  // Login com E-mail e Senha oficial do Supabase
  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      let detectedRole: UserRole | null = null;
      if (data.user) {
        detectedRole = await syncUserProfile(data.user.id);
      }

      return { success: true, role: detectedRole || undefined };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
    }
  };

  // Cadastro oficial exigindo código de convite
  const signUpWithInviteCode = async (params: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    inviteCode: string;
  }) => {
    try {
      setLoading(true);
      const validation = await validateInviteCode(params.inviteCode);
      if (!validation.valid) {
        setLoading(false);
        return { success: false, error: 'Código de convite inválido ou expirado.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email: params.email.trim(),
        password: params.password,
        options: {
          data: {
            name: params.name.trim(),
            phone: params.phone?.trim() || '',
            invite_code: params.inviteCode.trim().toUpperCase(),
          },
        },
      });

      if (error) {
        setLoading(false);
        return { success: false, error: error.message };
      }

      if (data.user) {
        await syncUserProfile(data.user.id);
      }

      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Erro no processo de cadastro.' };
    }
  };

  const loginAsPersonal = () => {
    setRole('PERSONAL');
  };

  const loginAsStudent = (studentId: string) => {
    setRole('STUDENT');
    setCurrentStudentId(studentId);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Erro ao deslogar do Supabase:', err);
    }
    setUser(null);
    setSession(null);
    setRole(null);
    setCurrentStudentId(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const switchRole = (newRole: UserRole, studentId?: string) => {
    setRole(newRole);
    if (studentId) {
      setCurrentStudentId(studentId);
    } else if (newRole === 'STUDENT' && !currentStudentId) {
      setCurrentStudentId('student-1');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        role,
        currentStudentId,
        user,
        session,
        loading,
        loginAsPersonal,
        loginAsStudent,
        loginWithPassword,
        signUpWithInviteCode,
        logout,
        switchRole,
        isAuthenticated: !!role || !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
