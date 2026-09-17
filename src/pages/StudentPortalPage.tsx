import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAppData } from '../context/AppDataContext';
import { Navigate } from 'react-router-dom';
import { StudentLayout, StudentTab } from '../components/student/StudentLayout';
import { StudentHomeTab } from '../components/student/StudentHomeTab';
import { WorkoutTrackerTab } from '../components/student/WorkoutTrackerTab';
import { EvolutionTab } from '../components/student/EvolutionTab';
import { PaymentTab } from '../components/student/PaymentTab';
import { ContactTab } from '../components/student/ContactTab';

export const StudentPortalPage: React.FC = () => {
  const { role, currentStudentId } = useAuth();
  const { students, isDemoMode } = useAppData();
  const [currentTab, setCurrentTab] = useState<StudentTab>('home');

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  // Professores reais não acessam a visão de aluno
  if (role === 'PERSONAL' && !isDemoMode) {
    return <Navigate to="/dashboard" replace />;
  }

  const activeStudent = students.find((s) => s.id === currentStudentId) || students[0];

  if (!activeStudent) {
    return (
      <div className="min-h-screen bg-[#080c14] text-white flex items-center justify-center p-4">
        Aluno não encontrado. Por favor retorne ao login.
      </div>
    );
  }

  return (
    <StudentLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'home' && (
        <StudentHomeTab student={activeStudent} onNavigateTab={setCurrentTab} />
      )}
      {currentTab === 'workout' && <WorkoutTrackerTab student={activeStudent} />}
      {currentTab === 'evolution' && <EvolutionTab student={activeStudent} />}
      {currentTab === 'payment' && <PaymentTab student={activeStudent} />}
      {currentTab === 'contact' && <ContactTab student={activeStudent} />}
    </StudentLayout>
  );
};
