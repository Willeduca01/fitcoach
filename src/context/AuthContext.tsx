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
  sendPasswordResetEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
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

  const [isPasswordRecovery, setIsPasswordRecovery] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash || '';
      const search = window.location.search || '';
      const inStorage = sessionStorage.getItem('fitcoach_password_recovery') === 'true';
      return inStorage || hash.includes('type=recovery') || search.includes('type=recovery');
    }
    return false;
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

    // 2. Escuta mudanças de auth (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        sessionStorage.setItem('fitcoach_password_recovery', 'true');
        window.location.hash = '#/redefinir-senha';
        setLoading(false);
        return;
      }

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
          let studentRecord: { id: string } | null = null;
          const { data: directRecord } = await supabase
            .from('students')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (directRecord) {
            studentRecord = directRecord;
          } else {
            // Se não encontrou por user_id, tenta vincular via API com service role
            const { data: authUser } = await supabase.auth.getUser();
            const userEmail = authUser?.user?.email;
            if (userEmail) {
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;
                const linkHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
                if (token) linkHeaders['Authorization'] = `Bearer ${token}`;

                let linkRes = await fetch('/api/link-student', {
                  method: 'POST',
                  headers: linkHeaders,
                  body: JSON.stringify({ userId, email: userEmail }),
                }).catch(() => null);

                if (!linkRes || linkRes.status === 404) {
                  linkRes = await fetch('/fitcoach/api/link-student', {
                    method: 'POST',
                    headers: linkHeaders,
                    body: JSON.stringify({ userId, email: userEmail }),
                  }).catch(() => null);
                }

                if (linkRes && linkRes.ok) {
                  const linkJson = await linkRes.json();
                  if (linkJson?.studentId) {
                    studentRecord = { id: linkJson.studentId };
                  }
                }
              } catch (linkErr) {
                console.warn('[AuthContext] Falha ao vincular aluno via API:', linkErr);
              }
            }
          }

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
    setIsPasswordRecovery(false);
    sessionStorage.removeItem('fitcoach_password_recovery');
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

  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const basePath = window.location.pathname.includes('/fitcoach') ? '/fitcoach' : '';
      const redirectTo = `${window.location.origin}${basePath}/#/redefinir-senha`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao enviar e-mail de recuperação.' };
    }
  };

  const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      setIsPasswordRecovery(false);
      sessionStorage.removeItem('fitcoach_password_recovery');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro ao atualizar a senha.' };
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
        sendPasswordResetEmail,
        updatePassword,
        isAuthenticated: !!session || !!user,
        isPasswordRecovery,
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
