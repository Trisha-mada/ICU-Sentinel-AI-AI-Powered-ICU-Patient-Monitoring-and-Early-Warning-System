import React, { useState } from 'react';
import { PatientDataProvider, usePatientData } from './context/PatientDataContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { ManualDataEntry } from './pages/ManualDataEntry';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import './styles.css';

const AppContent = () => {
  const { activePage, notification, clearNotification } = usePatientData();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onCloseMobile={() => {
          if (window.innerWidth <= 768) {
            setIsSidebarOpen(false);
          }
        }} 
      />

      <div className="main-content-wrapper">
        {/* Top Header */}
        <Header 
          onToggleSidebar={toggleSidebar} 
          isSidebarOpen={isSidebarOpen} 
        />

        {/* Global Toast Notification */}
        {notification && (
          <div className={`global-toast toast-${notification.type}`}>
            {notification.type === 'success' && <CheckCircle2 size={18} className="toast-icon" />}
            {notification.type === 'info' && <Info size={18} className="toast-icon" />}
            {notification.type === 'error' && <AlertCircle size={18} className="toast-icon" />}
            <span className="toast-msg">{notification.message}</span>
            <button className="toast-close" onClick={clearNotification}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Main Content View Switcher */}
        <main className="main-content">
          {activePage === 'dashboard' ? (
            <Dashboard />
          ) : (
            <ManualDataEntry />
          )}
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <PatientDataProvider>
      <AppContent />
    </PatientDataProvider>
  );
}

export default App;
