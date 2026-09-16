import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { PersonalDashboardPage } from './pages/PersonalDashboardPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { QuickSwitcher } from './components/common/QuickSwitcher';

const RootRedirect: React.FC = () => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
    <BrowserRouter>
      <ThemeProvider>
        <AppDataProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppDataProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;
