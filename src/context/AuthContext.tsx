import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';
import { validateInviteCode, sendPasswordResetEmail as apiSendReset, updatePassword as apiUpdatePassword } from '../lib/neon';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role?: UserRole | string;
  phone?: string;
  avatarUrl?: string;
  user_metadata?: { name?: string; role?: string; [key: string]: any };
  created_at?: string;
}

export interface AuthSession {
  user: AuthUser;
  token?: string;
}

interface AuthContextType {
  role: UserRole | null;
  currentStudentId: string | null;
  user: AuthUser | null;
  session: AuthSession | null;
  loading: boolean;
  loginAsPersonal: () => void;
  loginAsStudent: (studentId: string) => void;
  loginAsMaster: () => void;
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
  updatePassword: (newPassword: string, token?: string, email?: string) => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isPasswordRecovery: boolean;
}

const AUTH_STORAGE_KEY = 'fitcoach_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user) {
          return {
            id: parsed.user.id,
            email: parsed.user.email,
            name: parsed.user.name,
            role: parsed.role,
            phone: parsed.user.phone,
            avatarUrl: parsed.user.avatarUrl,
            user_metadata: { name: parsed.user.name, role: parsed.role },
            created_at: new Date().toISOString(),
          };
        }
        if (parsed.role === 'MASTER') {
          return {
            id: 'dev-master-id',
            email: 'dev.dev@fitcoach.com.br',
            name: 'Desenvolvedor Master',
            role: 'MASTER',
            user_metadata: { name: 'Desenvolvedor Master', role: 'MASTER' },
            created_at: new Date().toISOString(),
          };
        }
        if (parsed.role === 'PERSONAL') {
          return {
            id: 'demo-personal-id',
            email: 'teste@fitcoach.com.br',
            name: 'Professor Demo',
            role: 'PERSONAL',
            user_metadata: { name: 'Professor Demo', role: 'PERSONAL' },
            created_at: new Date().toISOString(),
          };
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const [session, setSession] = useState<AuthSession | null>(() => {
    if (user) return { user };
    return null;
  });

  const [loading, setLoading] = useState(false);

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
    return null;
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
      return inStorage || hash.includes('redefinir-senha') || search.includes('type=recovery');
    }
    return false;
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, currentStudentId, user }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [role, currentStudentId, user]);

  // Login com E-mail e Senha conectado ao Neon Postgres
  const loginWithPassword = async (email: string, password: string): Promise<{ success: boolean; role?: UserRole; error?: string }> => {
    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();

      let loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      }).catch(() => null);

      if (!loginRes || loginRes.status === 404) {
        loginRes = await fetch('/fitcoach/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        }).catch(() => null);
      }

      if (loginRes) {
        const json = await loginRes.json().catch(() => null);
        if (loginRes.ok && json?.success && json?.user) {
          const userRole = json.role as UserRole;
          const studentId = json.studentId || null;

          const loggedUser: AuthUser = {
            id: json.user.id,
            email: json.user.email,
            name: json.user.name,
            role: userRole,
            phone: json.user.phone,
            avatarUrl: json.user.avatarUrl,
            user_metadata: { name: json.user.name, role: userRole },
            created_at: new Date().toISOString(),
          };

          setUser(loggedUser);
          setSession({ user: loggedUser });
          setRole(userRole);
          if (studentId) setCurrentStudentId(studentId);

          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ role: userRole, currentStudentId: studentId, user: loggedUser })
          );

          setLoading(false);
          return { success: true, role: userRole };
        } else if (!loginRes.ok && json?.error) {
          setLoading(false);
          return { success: false, error: json.error };
        }
      }

      setLoading(false);
      return { success: false, error: 'Não foi possível conectar ao servidor de autenticação.' };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Erro inesperado ao realizar login.' };
    }
  };

  // Cadastro oficial exigindo código de convite no Neon Postgres
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
        return { success: false, error: validation.error || 'Código de convite inválido ou expirado.' };
      }

      let apiRes = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: params.name.trim(),
          email: params.email.trim(),
          phone: params.phone?.trim() || '',
          password: params.password,
          inviteCode: params.inviteCode.trim().toUpperCase(),
        }),
      }).catch(() => null);

      if (!apiRes || apiRes.status === 404) {
        apiRes = await fetch('/fitcoach/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: params.name.trim(),
            email: params.email.trim(),
            phone: params.phone?.trim() || '',
            password: params.password,
            inviteCode: params.inviteCode.trim().toUpperCase(),
          }),
        }).catch(() => null);
      }

      if (apiRes && apiRes.ok) {
        const regData = await apiRes.json();
        const registeredUser = regData.user;
        const userRole = (registeredUser?.role as UserRole) || (validation.inviteType === 'STUDENT' ? 'STUDENT' : 'PERSONAL');

        const localUser: AuthUser = {
          id: registeredUser.id,
          email: registeredUser.email,
          name: registeredUser.name,
          role: userRole,
          user_metadata: { name: registeredUser.name, role: userRole },
          created_at: new Date().toISOString(),
        };

        setUser(localUser);
        setSession({ user: localUser });
        setRole(userRole);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role: userRole, currentStudentId: null, user: localUser }));

        setLoading(false);
        return { success: true };
      } else if (apiRes && !apiRes.ok) {
        const errJson = await apiRes.json().catch(() => null);
        setLoading(false);
        return { success: false, error: errJson?.error || 'Erro no processo de cadastro.' };
      }

      setLoading(false);
      return { success: false, error: 'Falha de comunicação com o servidor Neon.' };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Erro no processo de cadastro.' };
    }
  };

  const loginAsPersonal = () => {
    const demoUser: AuthUser = {
      id: 'demo-personal-id',
      email: 'teste@fitcoach.com.br',
      name: 'Professor Demo',
      role: 'PERSONAL',
      user_metadata: { name: 'Professor Demo', role: 'PERSONAL' },
      created_at: new Date().toISOString(),
    };
    setRole('PERSONAL');
    setUser(demoUser);
    setSession({ user: demoUser });
  };

  const loginAsStudent = (studentId: string) => {
    const studentUser: AuthUser = {
      id: studentId,
      email: 'aluno.demo@fitcoach.com.br',
      name: 'Aluno Demonstrativo',
      role: 'STUDENT',
      user_metadata: { name: 'Aluno Demonstrativo', role: 'STUDENT' },
      created_at: new Date().toISOString(),
    };
    setRole('STUDENT');
    setCurrentStudentId(studentId);
    setUser(studentUser);
    setSession({ user: studentUser });
  };

  const loginAsMaster = () => {
    const masterUser: AuthUser = {
      id: 'dev-master-id',
      email: 'dev.dev@fitcoach.com.br',
      name: 'Desenvolvedor Master',
      role: 'MASTER',
      user_metadata: { name: 'Desenvolvedor Master', role: 'MASTER' },
      created_at: new Date().toISOString(),
    };
    setRole('MASTER');
    setUser(masterUser);
    setSession({ user: masterUser });
  };

  const logout = async () => {
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
    return apiSendReset(email);
  };

  const updatePassword = async (newPassword: string, token?: string, email?: string): Promise<{ success: boolean; error?: string }> => {
    const res = await apiUpdatePassword(newPassword, token, email);
    if (res.success) {
      setIsPasswordRecovery(false);
      sessionStorage.removeItem('fitcoach_password_recovery');
    }
    return res;
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
        loginAsMaster,
        loginWithPassword,
        signUpWithInviteCode,
        logout,
        switchRole,
        sendPasswordResetEmail,
        updatePassword,
        isAuthenticated: !!session || !!user || !!role,
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
