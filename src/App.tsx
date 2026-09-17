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
import { QuickSwitcher } from './components/common/QuickSwitcher';

const RootRedirect: React.FC = () => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'MASTER') {
    return <Navigate to="/master" replace />;
  }

  if (role === 'PERSONAL') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/portal-aluno" replace />;
};

export const AppContent: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#09090b] text-zinc-100 font-sans transition-colors duration-200">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/cadastro" element={<RegisterPage />} />
        <Route path="/ativar-convite" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/master" element={<MasterDashboardPage />} />
        <Route path="/dashboard" element={<PersonalDashboardPage />} />
        <Route path="/portal-aluno" element={<StudentPortalPage />} />
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>

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
            <AppContent />
          </AppDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
