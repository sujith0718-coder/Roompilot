import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import { NavTab } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RoomAvailabilityPage } from './pages/RoomAvailabilityPage';
import { TimetablePage } from './pages/TimetablePage';
import { BookingRequestPage } from './pages/BookingRequestPage';
import { AllocationComparisonPage } from './pages/AllocationComparisonPage';
import { AllocationExplanationsPage } from './pages/AllocationExplanationsPage';
import { DisruptionRecoveryPage } from './pages/DisruptionRecoveryPage';
import { AuditLogsPage } from './pages/AuditLogsPage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <AppLayout activeTab={activeTab} onSelectTab={setActiveTab}>
      {activeTab === 'dashboard' && <DashboardPage onNavigate={(tab) => setActiveTab(tab as NavTab)} />}
      {activeTab === 'rooms' && <RoomAvailabilityPage />}
      {activeTab === 'timetable' && <TimetablePage />}
      {activeTab === 'bookings' && <BookingRequestPage />}
      {activeTab === 'comparison' && <AllocationComparisonPage />}
      {activeTab === 'explanations' && <AllocationExplanationsPage />}
      {activeTab === 'recovery' && <DisruptionRecoveryPage />}
      {activeTab === 'audit' && <AuditLogsPage />}
    </AppLayout>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
