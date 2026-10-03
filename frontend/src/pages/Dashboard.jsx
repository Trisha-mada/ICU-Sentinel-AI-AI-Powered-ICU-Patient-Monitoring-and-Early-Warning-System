import React, { useState, useMemo } from 'react';
import { 
  Users, 
  AlertTriangle, 
  Cpu, 
  WifiOff, 
  Search, 
  Filter, 
  Activity, 
  Heart, 
  Wind, 
  Thermometer, 
  Gauge, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  FileText, 
  Pill, 
  Droplet, 
  FlaskConical, 
  FileSpreadsheet,
  Info,
  ChevronRight,
  ShieldCheck,
  BedDouble,
  UserPlus,
  Loader2,
  RotateCw,
  LogOut,
  Archive,
  Calendar,
  Building,
  Sparkles
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { usePatientData, FIXED_ICU_BEDS } from '../context/PatientDataContext';
import { AddPatientModal } from '../components/AddPatientModal';
import { DischargePatientModal } from '../components/DischargePatientModal';

export const Dashboard = () => {
  const { 
    patients, 
    all12Beds,
    patientHistory: dischargedHistory,
    selectedPatientId, 
    setSelectedPatientId, 
    selectedPatient, 
    observationsHistory, 
    medications,
    fluidRecords,
    labResults,
    clinicalNotes,
    alerts, 
    devices, 
    stats,
    acknowledgeAlert,
    setActivePage,
    isLoadingPatients,
    isRefreshing,
    lastRefreshed,
    refreshData,
    livePatientsCount,
    dbStatus,
    isDemoViewEnabled,
    toggleDemoView
  } = usePatientData();

  // Modals State
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [preselectedBed, setPreselectedBed] = useState(null);
  const [dischargingPatient, setDischargingPatient] = useState(null);

  // View Switcher: 'active' (12-bed grid) | 'history' (discharged patients)
  const [dashboardView, setDashboardView] = useState('active');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedChartMetric, setSelectedChartMetric] = useState('all');
  const [activeDetailTab, setActiveDetailTab] = useState('vitals'); // 'vitals' | 'notes' | 'meds' | 'fluids' | 'labs'

  // Map active patients by Bed Number for quick lookup
  const patientsByBed = useMemo(() => {
    const map = new Map();
    patients.forEach(p => {
      map.set(p.bedNumber, p);
    });
    return map;
  }, [patients]);

  // Selected Patient's Data
  const patientHistoryLogs = useMemo(() => observationsHistory[selectedPatientId] || [], [observationsHistory, selectedPatientId]);
  const patientMeds = useMemo(() => medications[selectedPatientId] || [], [medications, selectedPatientId]);
  const patientFluids = useMemo(() => fluidRecords[selectedPatientId] || [], [fluidRecords, selectedPatientId]);
  const patientLabs = useMemo(() => labResults[selectedPatientId] || [], [labResults, selectedPatientId]);
  const patientNotes = useMemo(() => clinicalNotes[selectedPatientId] || [], [clinicalNotes, selectedPatientId]);
  const patientAlerts = useMemo(() => alerts.filter(a => a.patientId === selectedPatientId), [alerts, selectedPatientId]);
  const patientDevices = useMemo(() => devices.filter(d => d.patientId === selectedPatientId), [devices, selectedPatientId]);

  const handleOpenAdmitModal = (bedNumber = null) => {
    setPreselectedBed(bedNumber);
    setIsAddPatientOpen(true);
  };

  const handleOpenDischargeModal = (patientToDischarge) => {
    setDischargingPatient(patientToDischarge);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Critical':
        return <span className="status-badge badge-critical"><AlertTriangle size={12} /> Critical</span>;
      case 'Alert':
        return <span className="status-badge badge-warning"><AlertCircle size={12} /> Alert</span>;
      case 'Stable':
        return <span className="status-badge badge-success"><CheckCircle2 size={12} /> Stable</span>;
      case 'Observation':
      default:
        return <span className="status-badge badge-neutral"><Activity size={12} /> Observation</span>;
    }
  };

  const getDeviceBadge = (status) => {
    switch (status) {
      case 'Connected':
        return <span className="dev-status dev-connected"><span className="status-dot dot-stable"></span> Connected</span>;
      case 'Disconnected':
        return <span className="dev-status dev-disconnected"><span className="status-dot dot-critical"></span> Disconnected</span>;
      case 'Demo':
        return <span className="dev-status dev-demo"><span className="status-dot dot-demo"></span> Demo Data</span>;
      case 'Unknown':
      default:
        return <span className="dev-status dev-unknown"><span className="status-dot dot-neutral"></span> Unconfigured</span>;
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Header Bar with Refresh & Actions */}
      <div className="page-header-simple flex-between flex-wrap gap-md">
        <div>
          <h2 className="dashboard-title">ICU Sentinel Monitoring Dashboard</h2>
          <p className="dashboard-subtitle">
            12-Bed Central Telemetry • Neon PostgreSQL Real-time Synchronization
          </p>
        </div>

        <div className="header-actions flex-align-center gap-sm flex-wrap">
          {/* Manual Refresh Button & Last Refreshed Timestamp */}
          <div className="header-refresh-group">
            <button 
              className="btn btn-outline flex-align-center gap-xs"
              onClick={refreshData}
              disabled={isRefreshing}
              title="Refresh all 12 beds and active patient telemetry from Neon PostgreSQL"
            >
              <RotateCw size={14} className={isRefreshing ? 'animate-spin text-blue' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <span className="last-refreshed-text" title="Source: Neon PostgreSQL Database">
              <Clock size={12} /> {lastRefreshed}
            </span>
          </div>

          <button 
            className="btn btn-primary"
            onClick={() => handleOpenAdmitModal(null)}
            disabled={stats.occupiedBedsCount >= 12}
            title={stats.occupiedBedsCount >= 12 ? 'All 12 ICU beds are currently occupied.' : 'Register and admit a new patient'}
          >
            <UserPlus size={16} />
            <span>+ Add Patient</span>
          </button>

          <button 
            className="btn btn-outline"
            onClick={() => setActivePage('entry')}
          >
            <FileSpreadsheet size={16} />
            <span>Enter Clinical Data</span>
          </button>
        </div>
      </div>

      {/* Demo View Indicator */}
      {isDemoViewEnabled && (
        <div className="demo-banner-indicator flex-between">
          <div className="flex-align-center gap-sm">
            <Info size={16} className="text-amber" />
            <span><strong>Demo Mode Active:</strong> Displaying synthetic baseline reference data.</span>
          </div>
          <button className="btn btn-sm btn-outline" onClick={toggleDemoView}>
            Return to Live Database
          </button>
        </div>
      )}

      {/* Summary Row */}
      <section className="summary-row-grid" aria-label="ICU Summary Metrics">
        <div className="summary-chip">
          <div className="chip-icon icon-blue">
            <Users size={20} />
          </div>
          <div className="chip-data">
            <span className="chip-label">ICU Bed Occupancy</span>
            <span className="chip-val">{stats.occupiedBedsCount} of 12 Beds Occupied</span>
          </div>
        </div>

        <div className="summary-chip">
          <div className="chip-icon icon-teal">
            <BedDouble size={20} />
          </div>
          <div className="chip-data">
            <span className="chip-label">Available Beds</span>
            <span className="chip-val text-teal">{stats.availableBedsCount} Ready for Admission</span>
          </div>
        </div>

        <div className="summary-chip">
          <div className="chip-icon icon-amber">
            <AlertTriangle size={20} />
          </div>
          <div className="chip-data">
            <span className="chip-label">Patients Requiring Attention</span>
            <span className="chip-val text-amber">{stats.patientsWithAlerts} Alert / Critical</span>
          </div>
        </div>

        <div className="summary-chip">
          <div className="chip-icon icon-teal">
            <Cpu size={20} />
          </div>
          <div className="chip-data">
            <span className="chip-label">Connected Devices</span>
            <span className="chip-val text-teal">{stats.connectedDevices} Online Monitors & Vents</span>
          </div>
        </div>
      </section>

      {/* View Switcher Tabs: 12-Bed Active Telemetry vs Discharged History */}
      <div className="dashboard-view-tabs">
        <button 
          className={`view-tab-btn ${dashboardView === 'active' ? 'active' : ''}`}
          onClick={() => setDashboardView('active')}
        >
          <Activity size={14} />
          <span>12-Bed Central ICU Telemetry ({stats.occupiedBedsCount}/12 Occupied)</span>
        </button>

        <button 
          className={`view-tab-btn ${dashboardView === 'history' ? 'active' : ''}`}
          onClick={() => setDashboardView('history')}
        >
          <Archive size={14} />
          <span>Discharged Patients Archive / History ({dischargedHistory.length})</span>
        </button>
      </div>

      {/* VIEW 1: 12-BED CENTRAL MONITORING GRID */}
      {dashboardView === 'active' && (
        <>
          <section className="dashboard-card central-monitoring-station-card">
            <div className="card-header-simple flex-between flex-wrap gap-md">
              <div>
                <h3 className="section-title">Central ICU Patient Monitoring Station</h3>
                <p className="section-subtitle">
                  Fixed 12-Bed Unit Layout (ICU-01 to ICU-12) • Click any occupied bed to view deep telemetry & clinical records
                </p>
              </div>

              {patients.length > 0 && (
                <div className="roster-filters">
                  <div className="search-box">
                    <Search size={15} className="search-icon" />
                    <input
                      type="text"
                      placeholder="Search patient, ID, diagnosis..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="search-input"
                      aria-label="Search patients"
                    />
                  </div>

                  <div className="filter-box">
                    <Filter size={14} className="filter-icon" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="filter-select"
                      aria-label="Filter status"
                    >
                      <option value="ALL">All Statuses ({patients.length})</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="ALERT">Alert</option>
                      <option value="STABLE">Stable</option>
                      <option value="OBSERVATION">Observation</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Central 12-Bed Grid */}
            {isLoadingPatients ? (
              <div className="empty-icu-state-card">
                <Loader2 size={36} className="text-blue animate-spin" />
                <h4 className="empty-state-title" style={{ marginTop: '1rem' }}>Connecting to Neon PostgreSQL...</h4>
                <p className="empty-state-desc">Loading active ICU patient telemetry and 12-bed occupancy records.</p>
              </div>
            ) : (
              <div className="central-monitoring-grid">
                {FIXED_ICU_BEDS.map(bedNumber => {
                  const patient = patientsByBed.get(bedNumber);
                  const isOccupied = !!patient;

                  // Apply search/filter to occupied beds if active
                  if (isOccupied && (searchQuery || statusFilter !== 'ALL')) {
                    const q = searchQuery.toLowerCase().trim();
                    const matchesSearch = 
                      !q ||
                      patient.name.toLowerCase().includes(q) ||
                      patient.id.toLowerCase().includes(q) ||
                      patient.bedNumber.toLowerCase().includes(q) ||
                      patient.diagnosis.toLowerCase().includes(q);
                    
                    const matchesStatus = statusFilter === 'ALL' || patient.status.toUpperCase() === statusFilter;
                    if (!matchesSearch || !matchesStatus) return null;
                  }

                  // 1. Render OCCUPIED Bed Card
                  if (isOccupied) {
                    const isSelected = patient.id === selectedPatientId;
                    const vit = patient.vitals || {};

                    return (
                      <div
                        key={bedNumber}
                        className={`central-bed-panel status-${patient.status.toLowerCase()} ${isSelected ? 'selected-bed-panel' : ''}`}
                        onClick={() => setSelectedPatientId(patient.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPatientId(patient.id); }}
                        aria-label={`Select Bed ${patient.bedNumber} - ${patient.name}`}
                      >
                        {/* Bed Panel Header */}
                        <div className="bed-panel-header flex-between">
                          <div className="bed-meta-left">
                            <span className="bed-badge-title">{patient.bedNumber}</span>
                            <span className="bed-patient-id font-mono">{patient.id}</span>
                            {patient.ventilatorAttached && (
                              <span className="vent-indicator-mini" title="Mechanical Ventilator Connected">VENT</span>
                            )}
                          </div>
                          <div className="bed-meta-right">
                            {getStatusBadge(patient.status)}
                          </div>
                        </div>

                        {/* Patient Name & Demographics */}
                        <div className="bed-patient-info flex-between">
                          <span className="bed-patient-name">{patient.name}</span>
                          <span className="bed-patient-demog">{patient.age}y {patient.gender[0]}</span>
                        </div>
                        <p className="bed-patient-diag" title={patient.diagnosis}>{patient.diagnosis}</p>

                        {/* Telemetry Block */}
                        <div className="bed-telemetry-grid">
                          {/* Heart Rate */}
                          <div className={`param-cell param-hr status-${vit.heartRate?.status || 'normal'}`}>
                            <div className="param-header flex-between">
                              <span className="param-name"><Heart size={12} className="text-rose" /> HR</span>
                              <span className="param-unit">bpm</span>
                            </div>
                            <div className="param-val">{vit.heartRate?.value ?? '—'}</div>
                            <div className="param-sublabel">
                              {vit.heartRate?.status === 'critical' ? 'CRITICAL HR' : vit.heartRate?.status === 'warning' ? 'TACHY/BRADY' : 'SINUS'}
                            </div>
                          </div>

                          {/* Blood Pressure */}
                          <div className={`param-cell param-bp status-${vit.bloodPressure?.status || 'normal'}`}>
                            <div className="param-header flex-between">
                              <span className="param-name"><Gauge size={12} className="text-blue" /> NIBP</span>
                              <span className="param-unit">mmHg</span>
                            </div>
                            <div className="param-val">
                              {vit.bloodPressure?.systolic ? `${vit.bloodPressure.systolic}/${vit.bloodPressure.diastolic}` : '—'}
                            </div>
                            <div className="param-sublabel">
                              {vit.bloodPressure?.mean ? `MAP ${vit.bloodPressure.mean}` : 'BP NORMAL'}
                            </div>
                          </div>

                          {/* Oxygen Saturation */}
                          <div className={`param-cell param-spo2 status-${vit.spo2?.status || 'normal'}`}>
                            <div className="param-header flex-between">
                              <span className="param-name"><Activity size={12} className="text-teal" /> SpO₂</span>
                              <span className="param-unit">%</span>
                            </div>
                            <div className="param-val">{vit.spo2?.value ? `${vit.spo2.value}%` : '—'}</div>
                            <div className="param-sublabel">
                              {vit.spo2?.status === 'critical' ? 'HYPOXIA' : vit.spo2?.status === 'warning' ? 'LOW O₂' : 'ADEQUATE'}
                            </div>
                          </div>

                          {/* Respiratory Rate */}
                          <div className={`param-cell param-rr status-${vit.respiratoryRate?.status || 'normal'}`}>
                            <div className="param-header flex-between">
                              <span className="param-name"><Wind size={12} className="text-cyan" /> RR</span>
                              <span className="param-unit">/min</span>
                            </div>
                            <div className="param-val">{vit.respiratoryRate?.value ?? '—'}</div>
                            <div className="param-sublabel">
                              {vit.respiratoryRate?.status === 'critical' ? 'TACHYPNEA' : vit.respiratoryRate?.status === 'warning' ? 'ELEVATED' : 'EUPNEIC'}
                            </div>
                          </div>

                          {/* Temperature */}
                          <div className={`param-cell param-temp status-${vit.temperature?.status || 'normal'}`}>
                            <div className="param-header flex-between">
                              <span className="param-name"><Thermometer size={12} className="text-amber" /> TEMP</span>
                              <span className="param-unit">°C</span>
                            </div>
                            <div className="param-val">{vit.temperature?.value ? `${vit.temperature.value}°` : '—'}</div>
                            <div className="param-sublabel">
                              {vit.temperature?.status === 'critical' ? 'HIGH FEVER' : vit.temperature?.status === 'warning' ? 'PYREXIA' : 'NORMAL'}
                            </div>
                          </div>
                        </div>

                        {/* Bed Footer & Actions */}
                        <div className="bed-panel-footer flex-between">
                          <span className="bed-sync-time">
                            <Clock size={11} /> {patient.lastUpdated}
                          </span>
                          <div className="flex-align-center gap-xs">
                            <button 
                              className="btn btn-xs btn-outline text-rose"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenDischargeModal(patient);
                              }}
                              title={`Discharge patient from ${patient.bedNumber}`}
                            >
                              <LogOut size={11} /> Discharge
                            </button>
                            <span className={`bed-select-badge ${isSelected ? 'active' : ''}`}>
                              {isSelected ? '● Active' : 'Select'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // 2. Render AVAILABLE Bed Card
                  return (
                    <div
                      key={bedNumber}
                      className="central-bed-panel bed-available"
                    >
                      <div className="bed-panel-header flex-between">
                        <span className="bed-badge-title">{bedNumber}</span>
                        <span className="available-bed-badge">● Available</span>
                      </div>

                      <div className="available-bed-body">
                        <div className="available-icon-wrap">
                          <BedDouble size={22} />
                        </div>
                        <h4 className="available-title">Bed {bedNumber} Available</h4>
                        <p className="available-desc">Sanitized and ready for patient admission.</p>
                        <button
                          type="button"
                          className="btn-admit-slot"
                          onClick={() => handleOpenAdmitModal(bedNumber)}
                        >
                          <UserPlus size={13} />
                          <span>+ Admit Patient</span>
                        </button>
                      </div>

                      <div className="bed-panel-footer flex-between">
                        <span className="bed-sync-time text-muted">Ready for allocation</span>
                        <span className="text-muted" style={{ fontSize: '10px' }}>Slot Unassigned</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Selected Patient Detailed Monitoring Section */}
          {selectedPatient && (
            <section className="selected-patient-area">
              {/* Patient Details Banner */}
              <div className="patient-banner">
                <div className="banner-info-left">
                  <div className="bed-large-box">
                    <BedDouble size={22} />
                    <span>{selectedPatient.bedNumber}</span>
                  </div>
                  <div className="banner-text">
                    <div className="banner-name-row">
                      <h3 className="patient-full-name">{selectedPatient.name}</h3>
                      <span className="patient-id-label font-mono">ID: {selectedPatient.id}</span>
                      {getStatusBadge(selectedPatient.status)}
                      {selectedPatient.isDemoData === false ? (
                        <span className="demo-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success-600, #059669)', borderColor: 'rgba(16, 185, 129, 0.3)', fontWeight: 700 }}>
                          ● LIVE NEON DB
                        </span>
                      ) : (
                        <span className="demo-tag">SYNTHETIC DEMO</span>
                      )}
                    </div>
                    <div className="banner-details-row">
                      <span><strong>Demographics:</strong> {selectedPatient.age} yrs, {selectedPatient.gender}</span>
                      <span>•</span>
                      <span><strong>Admitted:</strong> {selectedPatient.admissionDate}</span>
                      <span>•</span>
                      <span><strong>Diagnosis:</strong> {selectedPatient.diagnosis}</span>
                      <span>•</span>
                      <span><strong>Freshness:</strong> {selectedPatient.lastUpdated}</span>
                    </div>
                  </div>
                </div>

                <div className="banner-actions-right flex-align-center gap-sm">
                  {/* Discharge Patient Action */}
                  <button
                    className="btn btn-discharge"
                    onClick={() => handleOpenDischargeModal(selectedPatient)}
                    title="Discharge patient, release bed, and record discharge summary"
                  >
                    <LogOut size={15} />
                    <span>Discharge Patient</span>
                  </button>

                  <button
                    className="btn btn-outline"
                    onClick={() => setActivePage('entry')}
                    title="Open manual data entry form for this patient"
                  >
                    <FileText size={15} />
                    <span>Chart for this Patient</span>
                  </button>
                </div>
              </div>

              {/* Vital-Sign Monitoring Cards */}
              <div className="vitals-cards-container">
                <div className="vitals-header-simple flex-between">
                  <h4 className="vitals-heading">Current Telemetry & Vital Signs</h4>
                  <span className="source-disclaimer">
                    <Info size={13} /> Telemetry parameters updated live from Neon DB.
                  </span>
                </div>

                <div className="vitals-grid-clean">
                  {/* Heart Rate */}
                  <div className={`vital-box vital-hr status-${selectedPatient.vitals?.heartRate?.status || 'normal'}`}>
                    <div className="vital-box-top flex-between">
                      <span className="vital-label"><Heart size={15} className="text-rose" /> Heart Rate</span>
                      <span className={`pill-status ${selectedPatient.vitals?.heartRate?.status || 'normal'}`}>
                        {selectedPatient.vitals?.heartRate?.status?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                    <div className="vital-box-main">
                      <span className="vital-main-val">{selectedPatient.vitals?.heartRate?.value ?? '—'}</span>
                      <span className="vital-main-unit">{selectedPatient.vitals?.heartRate?.unit || 'bpm'}</span>
                    </div>
                    <div className="vital-box-rule">{selectedPatient.vitals?.heartRate?.statusLabel || 'Within standard limits'}</div>
                    <div className="vital-box-foot flex-between">
                      <span className="source-label">{selectedPatient.vitals?.heartRate?.source || 'Unrecorded'}</span>
                      <span className="time-label"><Clock size={11} /> {selectedPatient.vitals?.heartRate?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Blood Pressure */}
                  <div className={`vital-box vital-bp status-${selectedPatient.vitals?.bloodPressure?.status || 'normal'}`}>
                    <div className="vital-box-top flex-between">
                      <span className="vital-label"><Gauge size={15} className="text-blue" /> Blood Pressure</span>
                      <span className={`pill-status ${selectedPatient.vitals?.bloodPressure?.status || 'normal'}`}>
                        {selectedPatient.vitals?.bloodPressure?.status?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                    <div className="vital-box-main">
                      <span className="vital-main-val">
                        {selectedPatient.vitals?.bloodPressure?.systolic ? `${selectedPatient.vitals.bloodPressure.systolic}/${selectedPatient.vitals.bloodPressure.diastolic}` : '—'}
                      </span>
                      <span className="vital-main-unit">mmHg</span>
                      {selectedPatient.vitals?.bloodPressure?.mean && (
                        <span className="map-badge">MAP {selectedPatient.vitals.bloodPressure.mean}</span>
                      )}
                    </div>
                    <div className="vital-box-rule">{selectedPatient.vitals?.bloodPressure?.statusLabel || 'Within standard limits'}</div>
                    <div className="vital-box-foot flex-between">
                      <span className="source-label">{selectedPatient.vitals?.bloodPressure?.source || 'Unrecorded'}</span>
                      <span className="time-label"><Clock size={11} /> {selectedPatient.vitals?.bloodPressure?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* SpO2 */}
                  <div className={`vital-box vital-spo2 status-${selectedPatient.vitals?.spo2?.status || 'normal'}`}>
                    <div className="vital-box-top flex-between">
                      <span className="vital-label"><Activity size={15} className="text-teal" /> Oxygen Saturation</span>
                      <span className={`pill-status ${selectedPatient.vitals?.spo2?.status || 'normal'}`}>
                        {selectedPatient.vitals?.spo2?.status?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                    <div className="vital-box-main">
                      <span className="vital-main-val">{selectedPatient.vitals?.spo2?.value ? `${selectedPatient.vitals.spo2.value}%` : '—'}</span>
                      <span className="vital-main-unit">%</span>
                    </div>
                    <div className="vital-box-rule">{selectedPatient.vitals?.spo2?.statusLabel || 'Adequate oxygenation'}</div>
                    <div className="vital-box-foot flex-between">
                      <span className="source-label">{selectedPatient.vitals?.spo2?.source || 'Unrecorded'}</span>
                      <span className="time-label"><Clock size={11} /> {selectedPatient.vitals?.spo2?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Respiratory Rate */}
                  <div className={`vital-box vital-rr status-${selectedPatient.vitals?.respiratoryRate?.status || 'normal'}`}>
                    <div className="vital-box-top flex-between">
                      <span className="vital-label"><Wind size={15} className="text-cyan" /> Respiratory Rate</span>
                      <span className={`pill-status ${selectedPatient.vitals?.respiratoryRate?.status || 'normal'}`}>
                        {selectedPatient.vitals?.respiratoryRate?.status?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                    <div className="vital-box-main">
                      <span className="vital-main-val">{selectedPatient.vitals?.respiratoryRate?.value ?? '—'}</span>
                      <span className="vital-main-unit">/min</span>
                    </div>
                    <div className="vital-box-rule">{selectedPatient.vitals?.respiratoryRate?.statusLabel || 'Eupneic rate'}</div>
                    <div className="vital-box-foot flex-between">
                      <span className="source-label">{selectedPatient.vitals?.respiratoryRate?.source || 'Unrecorded'}</span>
                      <span className="time-label"><Clock size={11} /> {selectedPatient.vitals?.respiratoryRate?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Temperature */}
                  <div className={`vital-box vital-temp status-${selectedPatient.vitals?.temperature?.status || 'normal'}`}>
                    <div className="vital-box-top flex-between">
                      <span className="vital-label"><Thermometer size={15} className="text-amber" /> Temperature</span>
                      <span className={`pill-status ${selectedPatient.vitals?.temperature?.status || 'normal'}`}>
                        {selectedPatient.vitals?.temperature?.status?.toUpperCase() || 'NORMAL'}
                      </span>
                    </div>
                    <div className="vital-box-main">
                      <span className="vital-main-val">{selectedPatient.vitals?.temperature?.value ? `${selectedPatient.vitals.temperature.value}°` : '—'}</span>
                      <span className="vital-main-unit">°C</span>
                    </div>
                    <div className="vital-box-rule">{selectedPatient.vitals?.temperature?.statusLabel || 'Normothermic'}</div>
                    <div className="vital-box-foot flex-between">
                      <span className="source-label">{selectedPatient.vitals?.temperature?.source || 'Unrecorded'}</span>
                      <span className="time-label"><Clock size={11} /> {selectedPatient.vitals?.temperature?.timestamp || 'N/A'}</span>
                    </div>
                  </div>

                  {/* Ventilator Parameters */}
                  {selectedPatient.ventilatorAttached && (
                    <div className="vital-box vital-vent status-normal">
                      <div className="vital-box-top flex-between">
                        <span className="vital-label"><Wind size={15} className="text-teal" /> Mechanical Ventilator</span>
                        <span className="pill-status normal">VENTILATED</span>
                      </div>
                      <div className="vent-params-strip">
                        <span className="vent-mode-badge">{selectedPatient.vitals?.ventilatorParams?.mode || 'PRVC Mode'}</span>
                        <div className="vent-chips-row">
                          <span className="v-chip">PEEP: <strong>{selectedPatient.vitals?.ventilatorParams?.peep?.value || '8.0'}</strong> cmH₂O</span>
                          <span className="v-chip">FiO₂: <strong>{selectedPatient.vitals?.ventilatorParams?.fio2?.value || '45'}%</strong></span>
                          <span className="v-chip">Vt: <strong>{selectedPatient.vitals?.ventilatorParams?.tidalVolume?.value || '450'}</strong> mL</span>
                        </div>
                      </div>
                      <div className="vital-box-foot flex-between">
                        <span className="source-label">Active Ventilator Telemetry</span>
                        <span className="time-label"><Clock size={11} /> Continuous</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Trends & Clinical Records Tabs */}
              <div className="patient-deep-dive-grid">
                {/* Left Main: Trend Chart + Observation History */}
                <div className="dashboard-card trend-section-card">
                  <div className="card-header-simple flex-between flex-wrap gap-sm">
                    <div>
                      <h4 className="section-title">Vital-Sign Trend History</h4>
                      <p className="section-subtitle">Chronological observations for {selectedPatient.name}</p>
                    </div>

                    <div className="chart-toggles">
                      <button 
                        className={`chart-btn ${selectedChartMetric === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedChartMetric('all')}
                      >
                        All Trends
                      </button>
                      <button 
                        className={`chart-btn ${selectedChartMetric === 'hr' ? 'active' : ''}`}
                        onClick={() => setSelectedChartMetric('hr')}
                      >
                        Heart Rate
                      </button>
                      <button 
                        className={`chart-btn ${selectedChartMetric === 'bp' ? 'active' : ''}`}
                        onClick={() => setSelectedChartMetric('bp')}
                      >
                        Blood Pressure
                      </button>
                      <button 
                        className={`chart-btn ${selectedChartMetric === 'spo2' ? 'active' : ''}`}
                        onClick={() => setSelectedChartMetric('spo2')}
                      >
                        SpO₂
                      </button>
                      <button 
                        className={`chart-btn ${selectedChartMetric === 'temp' ? 'active' : ''}`}
                        onClick={() => setSelectedChartMetric('temp')}
                      >
                        Temperature
                      </button>
                    </div>
                  </div>

                  {/* Chart Canvas */}
                  <div className="chart-canvas-wrapper">
                    {patientHistoryLogs.length === 0 ? (
                      <div className="empty-chart">
                        <Activity size={32} className="text-muted" />
                        <p>No historical telemetry observations recorded yet for this stay.</p>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: 260 }}>
                        <ResponsiveContainer>
                          <LineChart data={patientHistoryLogs} margin={{ top: 10, right: 25, left: -15, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="timeLabel" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                borderRadius: '6px', 
                                border: '1px solid #cbd5e1',
                                fontSize: '12px'
                              }} 
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />

                            {(selectedChartMetric === 'all' || selectedChartMetric === 'hr') && (
                              <Line type="monotone" dataKey="hr" name="HR (bpm)" stroke="#e11d48" strokeWidth={2} dot={{ r: 3 }} />
                            )}
                            {(selectedChartMetric === 'all' || selectedChartMetric === 'bp') && (
                              <Line type="monotone" dataKey="bpSys" name="Sys BP (mmHg)" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                            )}
                            {(selectedChartMetric === 'all' || selectedChartMetric === 'bp') && (
                              <Line type="monotone" dataKey="bpDia" name="Dia BP (mmHg)" stroke="#93c5fd" strokeWidth={1.5} strokeDasharray="3 3" dot={{ r: 2 }} />
                            )}
                            {(selectedChartMetric === 'all' || selectedChartMetric === 'spo2') && (
                              <Line type="monotone" dataKey="spo2" name="SpO₂ (%)" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                            )}
                            {(selectedChartMetric === 'temp') && (
                              <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Charted Records Tabs */}
                  <div className="charted-records-tabs-container">
                    <div className="records-nav-tabs">
                      <button 
                        className={`rec-tab ${activeDetailTab === 'vitals' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('vitals')}
                      >
                        <Activity size={14} />
                        <span>Observation Logs ({patientHistoryLogs.length})</span>
                      </button>
                      <button 
                        className={`rec-tab ${activeDetailTab === 'notes' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('notes')}
                      >
                        <FileText size={14} />
                        <span>Clinical Notes ({patientNotes.length})</span>
                      </button>
                      <button 
                        className={`rec-tab ${activeDetailTab === 'meds' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('meds')}
                      >
                        <Pill size={14} />
                        <span>Medications MAR ({patientMeds.length})</span>
                      </button>
                      <button 
                        className={`rec-tab ${activeDetailTab === 'fluids' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('fluids')}
                      >
                        <Droplet size={14} />
                        <span>Fluid I/O ({patientFluids.length})</span>
                      </button>
                      <button 
                        className={`rec-tab ${activeDetailTab === 'labs' ? 'active' : ''}`}
                        onClick={() => setActiveDetailTab('labs')}
                      >
                        <FlaskConical size={14} />
                        <span>Labs & ABG ({patientLabs.length})</span>
                      </button>
                    </div>

                    <div className="records-tab-content">
                      {/* Tab 1: Observation Logs */}
                      {activeDetailTab === 'vitals' && (
                        <div className="table-mini-wrapper">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Time</th>
                                <th>HR</th>
                                <th>BP</th>
                                <th>SpO₂</th>
                                <th>RR</th>
                                <th>Temp</th>
                                <th>Source</th>
                                <th>Notes / Staff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientHistoryLogs.length === 0 ? (
                                <tr><td colSpan="8" className="empty-tab-text">No observations recorded yet for this stay.</td></tr>
                              ) : (
                                patientHistoryLogs.map(h => (
                                  <tr key={h.id}>
                                    <td className="font-mono">{h.timestamp}</td>
                                    <td><strong>{h.hr ?? '—'}</strong></td>
                                    <td>{h.bpSys ? `${h.bpSys}/${h.bpDia}` : '—'}</td>
                                    <td>{h.spo2 ? `${h.spo2}%` : '—'}</td>
                                    <td>{h.rr ?? '—'}</td>
                                    <td>{h.temp ? `${h.temp}°C` : '—'}</td>
                                    <td><span className="src-pill">{h.source}</span></td>
                                    <td><span className="note-snippet">{h.notes}</span> <small className="text-muted">({h.staff})</small></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tab 2: Clinical Notes */}
                      {activeDetailTab === 'notes' && (
                        <div className="notes-list-view">
                          {patientNotes.length === 0 ? (
                            <p className="empty-tab-text">No clinical notes recorded yet for this patient.</p>
                          ) : (
                            patientNotes.map(n => (
                              <div key={n.id} className="note-card-item">
                                <div className="note-card-top flex-between">
                                  <span className="note-author font-bold">{n.author}</span>
                                  <span className="note-time"><Clock size={11} /> {n.time}</span>
                                </div>
                                <span className="note-type-pill">{n.type}</span>
                                <p className="note-findings"><strong>Findings:</strong> {n.findings}</p>
                                <p className="note-plan"><strong>Plan / Orders:</strong> {n.plan}</p>
                                <div className="note-meta-row">
                                  <span><strong>Neuro/GCS:</strong> {n.gcsScore}</span>
                                  <span>•</span>
                                  <span><strong>Pupils:</strong> {n.pupils}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Tab 3: Medications (MAR) */}
                      {activeDetailTab === 'meds' && (
                        <div className="table-mini-wrapper">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Medication Name</th>
                                <th>Prescribed</th>
                                <th>Administered</th>
                                <th>Route</th>
                                <th>Schedule</th>
                                <th>Status</th>
                                <th>Admin Time</th>
                                <th>Staff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientMeds.length === 0 ? (
                                <tr><td colSpan="8" className="empty-tab-text">No medications charted.</td></tr>
                              ) : (
                                patientMeds.map(m => (
                                  <tr key={m.id}>
                                    <td><strong>{m.medicationName}</strong></td>
                                    <td>{m.prescribedDose} {m.doseUnit}</td>
                                    <td><span className="adm-dose-tag">{m.administeredDose} {m.doseUnit}</span></td>
                                    <td>{m.route}</td>
                                    <td>{m.frequency}</td>
                                    <td><span className="status-pill-small stable">{m.status}</span></td>
                                    <td className="font-mono">{m.time}</td>
                                    <td><small>{m.staff}</small></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tab 4: Fluid I/O */}
                      {activeDetailTab === 'fluids' && (
                        <div className="table-mini-wrapper">
                          <table className="mini-table">
                            <thead>
                              <tr>
                                <th>Interval / Time</th>
                                <th>Oral In</th>
                                <th>IV In</th>
                                <th>Total In</th>
                                <th>Urine Out</th>
                                <th>Other Out</th>
                                <th>Total Out</th>
                                <th>Net Balance</th>
                                <th>Urine Appearance</th>
                                <th>Staff</th>
                              </tr>
                            </thead>
                            <tbody>
                              {patientFluids.length === 0 ? (
                                <tr><td colSpan="10" className="empty-tab-text">No fluid balance entries.</td></tr>
                              ) : (
                                patientFluids.map(f => (
                                  <tr key={f.id}>
                                    <td className="font-mono">{f.interval || f.time}</td>
                                    <td>{f.oralIntake} mL</td>
                                    <td>{f.ivIntake} mL</td>
                                    <td><strong>{f.totalIntake} mL</strong></td>
                                    <td>{f.urineOutput} mL</td>
                                    <td>{f.otherOutput} mL</td>
                                    <td><strong>{f.totalOutput} mL</strong></td>
                                    <td>
                                      <span className={`net-bal-pill ${f.netBalance >= 0 ? 'pos' : 'neg'}`}>
                                        {f.netBalance >= 0 ? `+${f.netBalance}` : f.netBalance} mL
                                      </span>
                                    </td>
                                    <td>{f.urineAppearance}</td>
                                    <td><small>{f.staff}</small></td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Tab 5: Labs & ABG */}
                      {activeDetailTab === 'labs' && (
                        <div className="labs-list-view">
                          {patientLabs.length === 0 ? (
                            <p className="empty-tab-text">No laboratory results recorded.</p>
                          ) : (
                            patientLabs.map(l => (
                              <div key={l.id} className="lab-card-item">
                                <div className="lab-card-top flex-between">
                                  <span className="lab-panel-title font-bold">{l.panel}</span>
                                  <span className="lab-time font-mono"><Clock size={11} /> {l.collectionTime}</span>
                                </div>
                                <div className="lab-values-grid">
                                  {Object.entries(l.values || {}).map(([k, v]) => (
                                    <div key={k} className={`lab-val-chip ${v.flag || 'normal'}`}>
                                      <span className="lab-k">{k.toUpperCase()}</span>
                                      <span className="lab-v">{v.val} <small>{v.unit}</small></span>
                                      {v.ref && <span className="lab-ref">Ref: {v.ref}</span>}
                                    </div>
                                  ))}
                                </div>
                                {l.notes && <p className="lab-note">Note: {l.notes}</p>}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: Alerts Panel & Device Connectivity */}
                <div className="dashboard-side-col">
                  {/* Monitoring Alerts */}
                  <div className="dashboard-card alerts-box">
                    <div className="card-header-simple flex-between">
                      <div>
                        <h4 className="section-title">Patient Alerts</h4>
                        <p className="section-subtitle">Active conditions for {selectedPatient.name}</p>
                      </div>
                      <span className="count-pill">{patientAlerts.length}</span>
                    </div>

                    <div className="alerts-body">
                      {patientAlerts.length === 0 ? (
                        <div className="empty-alerts-clean">
                          <ShieldCheck size={26} className="text-emerald" />
                          <p>No active alerts for {selectedPatient.name}</p>
                          <span className="text-muted-xs">Monitored parameters within standard limits</span>
                        </div>
                      ) : (
                        patientAlerts.map(alt => (
                          <div key={alt.id} className={`alert-strip severity-${alt.severity} ${alt.isAcknowledged ? 'acked' : ''}`}>
                            <div className="alert-strip-header flex-between">
                              <span className="alert-param font-bold">{alt.parameter}</span>
                              <span className="alert-time font-mono">{alt.timestamp}</span>
                            </div>
                            <p className="alert-desc">{alt.description}</p>
                            <div className="alert-strip-foot flex-between">
                              <span className="alert-status-text">Status: {alt.status}</span>
                              {!alt.isAcknowledged ? (
                                <button className="btn-ack-clean" onClick={() => acknowledgeAlert(alt.id)}>
                                  <Check size={12} /> Acknowledge
                                </button>
                              ) : (
                                <span className="acked-label"><CheckCircle2 size={12} /> Acknowledged</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Device Status */}
                  <div className="dashboard-card devices-box">
                    <div className="card-header-simple flex-between">
                      <div>
                        <h4 className="section-title">Device Telemetry</h4>
                        <p className="section-subtitle">Bedside monitor status</p>
                      </div>
                      <span className="count-pill">{patientDevices.length} devices</span>
                    </div>

                    <div className="devices-body">
                      {patientDevices.length === 0 ? (
                        <div className="empty-devices-clean">
                          <p>No automated telemetry hardware connected to {selectedPatient.bedNumber}.</p>
                          <span className="text-muted-xs">Bed operates on bedside spot charting.</span>
                        </div>
                      ) : (
                        patientDevices.map(d => (
                          <div key={d.id} className="device-row-clean">
                            <div className="dev-header flex-between">
                              <span className="dev-name font-bold">{d.name}</span>
                              {getDeviceBadge(d.status)}
                            </div>
                            <div className="dev-meta flex-between">
                              <span>{d.type}</span>
                              <span className="font-mono">{d.lastSync}</span>
                            </div>
                            <span className="dev-freshness-pill">{d.dataFreshness}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {/* VIEW 2: DISCHARGED PATIENTS ARCHIVE & HISTORY */}
      {dashboardView === 'history' && (
        <section className="dashboard-card history-archive-container">
          <div className="card-header-simple flex-between flex-wrap gap-sm">
            <div>
              <h3 className="section-title flex-align-center gap-xs">
                <Archive size={18} className="text-blue" />
                <span>Discharged ICU Patients Archive & Historical Stays</span>
              </h3>
              <p className="section-subtitle">
                Permanent records stored in Neon PostgreSQL • Beds released while clinical observations & notes remain intact
              </p>
            </div>
            <button className="btn btn-outline flex-align-center gap-xs" onClick={refreshData}>
              <RotateCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh Archive</span>
            </button>
          </div>

          {dischargedHistory.length === 0 ? (
            <div className="empty-icu-state-card">
              <div className="empty-state-icon-badge">
                <Archive size={36} className="text-blue" />
              </div>
              <h4 className="empty-state-title">No Discharged Patients Recorded</h4>
              <p className="empty-state-desc">
                When patients are discharged from active ICU monitoring, their complete stay history, observations, and discharge summaries are preserved here.
              </p>
            </div>
          ) : (
            <div className="history-card-grid">
              {dischargedHistory.map(h => (
                <div key={h.admissionId} className="history-patient-card">
                  <div className="history-card-header flex-between">
                    <div>
                      <h4 className="patient-name-bold">{h.patientName}</h4>
                      <span className="patient-meta-text">
                        Patient ID: <strong className="font-mono">{h.patientId}</strong> {h.mrn ? `• MRN: ${h.mrn}` : ''}
                      </span>
                    </div>
                    <span className="stay-duration-pill">Stay Ended</span>
                  </div>

                  <div className="history-dates-grid">
                    <div>
                      <span className="date-label"><Calendar size={11} /> Admitted</span>
                      <span className="date-val">{h.admissionTimeFormatted || h.admissionDate}</span>
                    </div>
                    <div>
                      <span className="date-label"><Clock size={11} /> Discharged</span>
                      <span className="date-val text-amber">{h.dischargeDateFormatted || 'Recorded'}</span>
                    </div>
                  </div>

                  <div className="history-diag-text">
                    <p style={{ margin: '0 0 4px 0', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <strong>Bed Stayed:</strong> {h.bedNumber} • <strong>Diagnosis:</strong> {h.diagnosis}
                    </p>
                    {h.dischargeNotes && (
                      <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                        <strong>Discharge Summary:</strong> {h.dischargeNotes}
                      </p>
                    )}
                  </div>

                  {/* Preserved Clinical History Counts */}
                  <div className="history-records-badges">
                    <span className="record-count-chip" title="Vitals observations preserved in PostgreSQL">
                      <Activity size={11} className="text-teal" />
                      <span>{h.observationsCount || 0} Vitals Logs</span>
                    </span>
                    <span className="record-count-chip" title="Clinical notes preserved">
                      <FileText size={11} className="text-blue" />
                      <span>{h.notesCount || 0} Clinical Notes</span>
                    </span>
                    <span className="record-count-chip" title="Medications charted">
                      <Pill size={11} className="text-purple" />
                      <span>{h.medicationsCount || 0} Meds (MAR)</span>
                    </span>
                    <span className="record-count-chip" title="Fluid balance logs">
                      <Droplet size={11} className="text-cyan" />
                      <span>{h.fluidsCount || 0} Fluid I/O</span>
                    </span>
                    <span className="record-count-chip" title="Lab results">
                      <FlaskConical size={11} className="text-amber" />
                      <span>{h.labsCount || 0} Labs</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddPatientOpen} 
        onClose={() => {
          setIsAddPatientOpen(false);
          setPreselectedBed(null);
        }}
        initialBed={preselectedBed}
      />

      {/* Discharge Patient Modal */}
      <DischargePatientModal
        isOpen={!!dischargingPatient}
        patient={dischargingPatient}
        onClose={() => setDischargingPatient(null)}
      />
    </div>
  );
};

export default Dashboard;
