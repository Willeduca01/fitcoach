import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { PersonalLayout, PersonalTab } from '../components/personal/PersonalLayout';
import { OverviewTab } from '../components/personal/OverviewTab';
import { ScheduleTab } from '../components/personal/ScheduleTab';
import { StudentsTab } from '../components/personal/StudentsTab';
import { MessagesTab } from '../components/personal/MessagesTab';
import { FinancesTab } from '../components/personal/FinancesTab';
import { GrowthHubTab } from '../components/personal/GrowthHubTab';
import { Student } from '../types';

export const PersonalDashboardPage: React.FC = () => {
  const { role } = useAuth();
  const [currentTab, setCurrentTab] = useState<PersonalTab>('overview');
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
  const [chatStudentId, setChatStudentId] = useState<string | undefined>(undefined);

  // Proteção de rota por papel (RBAC):
  if (role === 'STUDENT') {
    return <Navigate to="/portal-aluno" replace />;
  }

  if (role === 'MASTER') {
    return <Navigate to="/master" replace />;
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  const handleSelectStudentFromOverview = (student: Student) => {
    setSelectedStudentForModal(student);
    setCurrentTab('students');
  };

  const handleNavigateTab = (tab: 'schedule' | 'students' | 'finances' | 'messages') => {
    setCurrentTab(tab);
  };

  const handleOpenChatWithStudent = (studentId: string) => {
    setChatStudentId(studentId);
    setCurrentTab('messages');
  };

  return (
    <PersonalLayout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'overview' && (
        <OverviewTab
          onSelectStudent={handleSelectStudentFromOverview}
          onNavigateTab={handleNavigateTab}
        />
      )}
      {currentTab === 'schedule' && <ScheduleTab />}
      {currentTab === 'students' && (
        <StudentsTab
          selectedStudentFromOutside={selectedStudentForModal}
          onOpenChat={handleOpenChatWithStudent}
        />
      )}
      {currentTab === 'messages' && (
        <MessagesTab
          initialStudentId={chatStudentId}
          onOpenStudentDetail={(student) => {
            setSelectedStudentForModal(student);
            setCurrentTab('students');
          }}
        />
      )}
      {currentTab === 'finances' && <FinancesTab />}
      {currentTab === 'growth' && <GrowthHubTab />}
    </PersonalLayout>
  );
};
