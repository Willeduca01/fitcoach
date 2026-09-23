import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PersonalDashboardPage } from './pages/PersonalDashboardPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { MasterDashboardPage } from './pages/MasterDashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { QuickSwitcher } from './components/common/QuickSwitcher';

const RootRedirect: React.FC = () => {
  const { role, isAuthenticated, isPasswordRecovery } = useAuth();

  const isRecovery =
    isPasswordRecovery ||
    (typeof window !== 'undefined' && (
      sessionStorage.getItem('fitcoach_password_recovery') === 'true' ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery')
    ));

  if (isRecovery) {
    return <Navigate to="/redefinir-senha" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'MASTER') {
    return <Navigate to="/master" replace />;
  }

  if (role === 'PERSONAL') {
    return <Navigate to="/dashboard" replace />;
  }

  if (role === 'STUDENT') {
    return <Navigate to="/portal-aluno" replace />;
  }

  return <Navigate to="/login" replace />;
};

// Intercepta e normaliza redirecionamentos de autenticação do Supabase (recovery, tokens no hash)
if (typeof window !== 'undefined') {
  const hash = window.location.hash || '';
  const search = window.location.search || '';

  const isRecovery =
    hash.includes('type=recovery') ||
    search.includes('type=recovery') ||
    sessionStorage.getItem('fitcoach_password_recovery') === 'true';

  if (isRecovery) {
    sessionStorage.setItem('fitcoach_password_recovery', 'true');
    if (!hash.startsWith('#/redefinir-senha')) {
      const cleanTokens = hash.startsWith('#') ? hash.substring(1) : hash;
      window.location.hash = cleanTokens ? `#/redefinir-senha?${cleanTokens}` : '#/redefinir-senha';
    }
  } else if (search.includes('code=') && (!hash || hash === '#/')) {
    window.location.hash = `#/redefinir-senha${search}`;
  }
}

import { FitnessBackground } from './components/common/FitnessBackground';

import { UserRole } from './types';
import { systemLogger } from './lib/systemLogger';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

/**
 * Guardião de Rota Protegida (RBAC Defense):
 * Bloqueia acessos não autenticados e restringe páginas sensíveis (ex: /master) apenas a perfis autorizados.
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { role, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a1312] text-zinc-100 flex flex-col items-center justify-center space-y-3 font-sans">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <p className="text-xs text-zinc-400 font-mono tracking-wider">Verificando autorização...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    systemLogger.warn(
      'SECURITY',
      'UNAUTHORIZED_ROUTE_ACCESS',
      `Tentativa de acesso não autenticado bloqueada na rota (${window.location.hash || window.location.pathname}).`,
      { path: window.location.hash || window.location.pathname }
    );
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    systemLogger.warn(
      'SECURITY',
      'UNAUTHORIZED_ROLE_ACCESS',
      `Acesso negado: Perfil '${role}' não tem permissão para acessar esta rota (${allowedRoles.join(', ')}).`,
      { currentRole: role, requiredRoles: allowedRoles, path: window.location.hash || window.location.pathname }
    );
    // Redireciona o usuário para o portal correspondente ao seu papel legítimo
    if (role === 'MASTER') return <Navigate to="/master" replace />;
    if (role === 'PERSONAL') return <Navigate to="/dashboard" replace />;
    if (role === 'STUDENT') return <Navigate to="/portal-aluno" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const AppContent: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#f0f4f2] dark:bg-[#0a1312] text-slate-800 dark:text-zinc-100 font-sans transition-colors duration-200">
      {/* Global Fitness Background Ambience & Watermarks */}
      <FitnessBackground />

      <div className="relative z-10">
        <Routes>
          {/* Rotas Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
          <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/cadastro" element={<RegisterPage />} />
          <Route path="/ativar-convite" element={<RegisterPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Rotas Administrativas de Desenvolvedor (Blindagem Estrita: Apenas MASTER) */}
          <Route
            path="/master"
            element={
              <ProtectedRoute allowedRoles={['MASTER']}>
                <MasterDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/master/logs"
            element={
              <ProtectedRoute allowedRoles={['MASTER']}>
                <MasterDashboardPage defaultTab="LOGS" />
              </ProtectedRoute>
            }
          />

          {/* Rotas de Professores / Personal Trainers */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['PERSONAL', 'MASTER']}>
                <PersonalDashboardPage />
              </ProtectedRoute>
            }
          />

          {/* Rotas de Alunos */}
          <Route
            path="/portal-aluno"
            element={
              <ProtectedRoute allowedRoles={['STUDENT', 'MASTER']}>
                <StudentPortalPage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<RootRedirect />} />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="/erro" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Floating RBAC Quick Switcher for seamless testing and demonstration */}
      <QuickSwitcher />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppDataProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AppDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
