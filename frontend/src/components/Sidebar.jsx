import React from 'react';
import { 
  LayoutDashboard, 
  ClipboardEdit, 
  Bed, 
  Activity, 
  HeartPulse, 
  AlertTriangle, 
  CheckCircle,
  Radio
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';

export const Sidebar = ({ isOpen, onCloseMobile }) => {
  const { 
    activePage, 
    setActivePage, 
    patients, 
    selectedPatientId, 
    setSelectedPatientId,
    stats 
  } = usePatientData();

  const handleNav = (page) => {
    setActivePage(page);
    if (onCloseMobile) onCloseMobile();
  };

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id);
    if (onCloseMobile) onCloseMobile();
  };

  const getStatusDotClass = (status) => {
    switch (status) {
      case 'Critical': return 'dot-critical';
      case 'Alert': return 'dot-alert';
      case 'Stable': return 'dot-stable';
      default: return 'dot-neutral';
    }
  };

  return (
    <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <div className="sidebar-section">
        <div className="sidebar-section-title">MAIN NAVIGATION</div>
        <nav className="sidebar-nav">
          <button
            id="nav-dashboard-btn"
            className={`nav-item ${activePage === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNav('dashboard')}
          >
            <LayoutDashboard size={18} className="nav-icon" />
            <span className="nav-label">ICU Monitoring Dashboard</span>
            {stats.patientsWithAlerts > 0 && (
              <span className="nav-badge alert" title={`${stats.patientsWithAlerts} patients requiring attention`}>
                {stats.patientsWithAlerts}
              </span>
            )}
          </button>

          <button
            id="nav-manual-entry-btn"
            className={`nav-item ${activePage === 'entry' ? 'active' : ''}`}
            onClick={() => handleNav('entry')}
          >
            <ClipboardEdit size={18} className="nav-icon" />
            <span className="nav-label">Manual Clinical Data Entry</span>
          </button>
        </nav>
      </div>

      {/* Patient Quick Selector */}
      <div className="sidebar-section quick-patients-section">
        <div className="sidebar-section-title flex-between">
          <span>ICU PATIENT BEDS ({patients.length})</span>
          <span className="text-muted-xs">Unit 3A</span>
        </div>
        <div className="quick-patient-list">
          {patients.map(p => {
            const isSelected = p.id === selectedPatientId;
            return (
              <button
                key={p.id}
                className={`quick-patient-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectPatient(p.id)}
                title={`Bed: ${p.bedNumber} | Patient: ${p.name} | Status: ${p.status}`}
              >
                <div className="quick-patient-header">
                  <span className="quick-bed-tag">{p.bedNumber}</span>
                  <span className={`status-pill-small ${p.status.toLowerCase()}`}>
                    <span className={`status-dot ${getStatusDotClass(p.status)}`}></span>
                    {p.status}
                  </span>
                </div>
                <div className="quick-patient-name">{p.name}</div>
                <div className="quick-patient-sub">
                  <span>{p.id}</span>
                  <span>•</span>
                  <span>{p.age}y {p.gender[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer with Architecture Note */}
      <div className="sidebar-footer">
        <div className="sidebar-arch-box">
          <div className="arch-box-header">
            <Radio size={14} className="arch-icon" />
            <span className="arch-title">ICU Sentinel Architecture</span>
          </div>
          <p className="arch-desc">
            Prepared for Express.js API, Neon PostgreSQL, and multiparameter monitor integration.
          </p>
          <div className="arch-tag">FINAL YEAR PROJECT</div>
        </div>
      </div>
    </aside>
  );
};
