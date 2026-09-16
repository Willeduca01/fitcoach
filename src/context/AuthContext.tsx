import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../types';

interface AuthContextType {
  role: UserRole | null;
  currentStudentId: string | null;
  loginAsPersonal: () => void;
  loginAsStudent: (studentId: string) => void;
  logout: () => void;
  switchRole: (role: UserRole, studentId?: string) => void;
  isAuthenticated: boolean;
}

const AUTH_STORAGE_KEY = 'fitcoach_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    return 'PERSONAL'; // Padrão inicial prático
  });

  const [currentStudentId, setCurrentStudentId] = useState<string | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.currentStudentId || 'student-1';
      } catch {
        return 'student-1';
      }
    }
    return 'student-1';
  });

  useEffect(() => {
    if (role) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ role, currentStudentId }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [role, currentStudentId]);

  const loginAsPersonal = () => {
    setRole('PERSONAL');
  };

  const loginAsStudent = (studentId: string) => {
    setRole('STUDENT');
    setCurrentStudentId(studentId);
  };

  const logout = () => {
    setRole(null);
    setCurrentStudentId(null);
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
        loginAsPersonal,
        loginAsStudent,
        logout,
        switchRole,
        isAuthenticated: !!role,
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
