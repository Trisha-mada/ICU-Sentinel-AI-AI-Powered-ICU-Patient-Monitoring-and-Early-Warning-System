import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Bell, 
  User, 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  Menu,
  X,
  Radio,
  Sun,
  Moon
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';

export const Header = ({ onToggleSidebar, isSidebarOpen }) => {
  const { alerts, stats, acknowledgeAlert, setSelectedPatientId, setActivePage, theme, toggleTheme, dbStatus } = usePatientData();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeAlerts = alerts.filter(a => !a.isAcknowledged);

  const formatDateTime = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const handleAlertClick = (alert) => {
    setSelectedPatientId(alert.patientId);
    setActivePage("dashboard");
    setShowAlertsDropdown(false);
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <div className="brand-badge">
          <div className="brand-logo-icon">
            <Activity size={20} className="pulse-icon" />
          </div>
          <div className="brand-text-group">
            <h1 className="brand-title">ICU Sentinel</h1>
            <span className="brand-subtitle">Clinical Monitoring & Deterioration System</span>
          </div>
        </div>

        {dbStatus === 'connected' ? (
          <div className="env-demo-pill env-live-pill" title="Connected to Neon PostgreSQL (neondb)">
            <span className="demo-dot dot-live" style={{ background: 'var(--success-500, #10b981)' }}></span>
            <span style={{ color: 'var(--success-600, #059669)', fontWeight: 600 }}>NEON DB CONNECTED</span>
          </div>
        ) : (
          <div className="env-demo-pill" title="Running in synthetic demo mode (Backend offline)">
            <span className="demo-dot"></span>
            <span>DEMO ENVIRONMENT</span>
          </div>
        )}
      </div>

      <div className="header-right">
        {/* Live Clock */}
        <div className="header-clock" title="Current Local Hospital Clock">
          <Clock size={15} className="clock-icon" />
          <span>{formatDateTime(currentTime)}</span>
        </div>

        {/* Light / Dark Theme Toggle Button */}
        <button
          className="header-icon-btn theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === 'dark' ? <Sun size={18} className="text-amber" /> : <Moon size={18} />}
        </button>

        {/* Alerts Notification Menu */}
        <div className="notifications-wrapper">
          <button 
            className={`header-icon-btn ${activeAlerts.length > 0 ? 'has-alerts' : ''}`}
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            aria-label="Clinical Alerts"
            title={`${activeAlerts.length} active monitoring alerts`}
          >
            <Bell size={19} />
            {activeAlerts.length > 0 && (
              <span className="alert-badge-count">{activeAlerts.length}</span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="alerts-dropdown-menu">
              <div className="dropdown-header">
                <div>
                  <h4 className="dropdown-title">Active Clinical Alerts</h4>
                  <p className="dropdown-subtitle">{activeAlerts.length} unacknowledged notifications</p>
                </div>
                <button 
                  className="dropdown-close-btn"
                  onClick={() => setShowAlertsDropdown(false)}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="dropdown-body">
                {activeAlerts.length === 0 ? (
                  <div className="empty-alerts">
                    <CheckCircle2 size={32} className="empty-icon" />
                    <p className="empty-text">No active clinical alerts</p>
                    <span className="empty-sub">All demo threshold parameters are within configured ranges.</span>
                  </div>
                ) : (
                  <ul className="alert-dropdown-list">
                    {activeAlerts.map(alert => (
                      <li key={alert.id} className={`alert-dropdown-item severity-${alert.severity}`}>
                        <div className="alert-item-header">
                          <span className="alert-patient-badge">{alert.bedNumber} • {alert.patientName}</span>
                          <span className="alert-time">{alert.timestamp}</span>
                        </div>
                        <p className="alert-item-desc">{alert.description}</p>
                        <div className="alert-item-actions">
                          <button 
                            className="btn-view-patient"
                            onClick={() => handleAlertClick(alert)}
                          >
                            View Patient
                          </button>
                          <button 
                            className="btn-ack-mini"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            Acknowledge
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="dropdown-footer">
                <span className="footer-disclaimer">Thresholds driven by configured demonstration rules.</span>
              </div>
            </div>
          )}
        </div>

        {/* Staff Profile */}
        <div className="staff-profile-widget">
          <div className="staff-avatar">
            <User size={18} />
          </div>
          <div className="staff-meta">
            <span className="staff-name">Dr. Sarah Lin, MD</span>
            <span className="staff-role">ICU Medical Officer</span>
          </div>
        </div>
      </div>
    </header>
  );
};
