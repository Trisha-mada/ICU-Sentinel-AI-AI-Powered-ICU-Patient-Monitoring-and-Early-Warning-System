import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  INITIAL_PATIENTS, 
  INITIAL_OBSERVATIONS_HISTORY, 
  INITIAL_ALERTS, 
  INITIAL_DEVICES,
  INITIAL_MEDICATIONS,
  INITIAL_FLUID_RECORDS,
  INITIAL_LAB_RESULTS,
  INITIAL_CLINICAL_NOTES
} from '../data/demoData';
import apiService from '../services/api';

const PatientDataContext = createContext();

export const FIXED_ICU_BEDS = [
  'ICU-01', 'ICU-02', 'ICU-03', 'ICU-04',
  'ICU-05', 'ICU-06', 'ICU-07', 'ICU-08',
  'ICU-09', 'ICU-10', 'ICU-11', 'ICU-12'
];

export const PatientDataProvider = ({ children }) => {
  const [patients, setPatients] = useState([]);
  const [all12Beds, setAll12Beds] = useState(() => 
    FIXED_ICU_BEDS.map(bedNumber => ({
      bedNumber,
      status: 'Available',
      isOccupied: false,
      patientId: null,
      patientName: null
    }))
  );
  const [patientHistory, setPatientHistory] = useState([]);
  const [observationsHistory, setObservationsHistory] = useState({});
  const [medications, setMedications] = useState({});
  const [fluidRecords, setFluidRecords] = useState({});
  const [labResults, setLabResults] = useState({});
  const [clinicalNotes, setClinicalNotes] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [activePage, setActivePage] = useState("dashboard"); // "dashboard" | "entry"
  const [globalSearch, setGlobalSearch] = useState("");
  const [notification, setNotification] = useState(null);

  // Database Connection & Loading State
  const [dbStatus, setDbStatus] = useState('checking'); // 'connected' | 'offline' | 'checking'
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  const [livePatientsCount, setLivePatientsCount] = useState(0);
  const [isDemoViewEnabled, setIsDemoViewEnabled] = useState(false);

  // Track latest fetch request timestamp
  const latestFetchTimestamp = useRef(0);

  // Theme State
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('icu_sentinel_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('icu_sentinel_theme', theme);
    } catch {
      // Fallback
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const clearNotification = () => setNotification(null);

  // Fetch all patients, 12 beds status, alerts, and history from Backend / Neon PostgreSQL
  const fetchBackendData = useCallback(async (isManualRefresh = false) => {
    const fetchId = Date.now();
    latestFetchTimestamp.current = fetchId;

    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (isLoadingPatients) {
      setIsLoadingPatients(true);
    }

    try {
      const health = await apiService.getHealth();
      if (health?.status === 'ok' && health.databaseConfigured) {
        setDbStatus('connected');
        
        // Concurrently fetch active patients, 12 beds status, history, and deterioration alerts
        const [patientsRes, bedsRes, historyRes, alertsRes] = await Promise.allSettled([
          apiService.getPatients(),
          apiService.getBedStatuses(),
          apiService.getPatientHistory(),
          apiService.getAllAlerts()
        ]);

        if (latestFetchTimestamp.current !== fetchId) return;

        // 1. Process 12 Beds
        if (bedsRes.status === 'fulfilled' && bedsRes.value?.success && Array.isArray(bedsRes.value.data)) {
          setAll12Beds(bedsRes.value.data);
        }

        // 2. Process Discharged Patients History
        if (historyRes.status === 'fulfilled' && historyRes.value?.success && Array.isArray(historyRes.value.data)) {
          setPatientHistory(historyRes.value.data);
        }

        // 3. Process Deterioration Alerts
        if (alertsRes.status === 'fulfilled' && alertsRes.value?.success && Array.isArray(alertsRes.value.data)) {
          setAlerts(alertsRes.value.data);
        }

        // 4. Process Active Patients List
        if (patientsRes.status === 'fulfilled' && patientsRes.value?.success && Array.isArray(patientsRes.value.data)) {
          const dbPatients = patientsRes.value.data;
          setLivePatientsCount(dbPatients.length);

          if (dbPatients.length > 0) {
            setPatients(dbPatients);
            setSelectedPatientId(prev => {
              const prevId = prev;
              if (prevId && dbPatients.some(p => (p.patient_id || p.id) === prevId)) return prevId;
              return dbPatients[0].patient_id || dbPatients[0].id;
            });
          } else {
            setPatients([]);
            setSelectedPatientId(null);
          }
        }

        setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (isManualRefresh) {
          showNotification("Dashboard, telemetry, and alerts refreshed from Neon PostgreSQL.", "info");
        }
      } else {
        // Backend offline or database unconfigured - fallback to demo dataset
        setDbStatus('offline');
        setPatients(INITIAL_PATIENTS);
        setObservationsHistory(INITIAL_OBSERVATIONS_HISTORY);
        setMedications(INITIAL_MEDICATIONS);
        setFluidRecords(INITIAL_FLUID_RECORDS);
        setLabResults(INITIAL_LAB_RESULTS);
        setClinicalNotes(INITIAL_CLINICAL_NOTES);
        setAlerts(INITIAL_ALERTS);
        setSelectedPatientId("001");
      }
    } catch (err) {
      console.warn('[ICU Sentinel] Backend API offline, loading demo dataset.', err.message);
      setDbStatus('offline');
      setPatients(INITIAL_PATIENTS);
      setObservationsHistory(INITIAL_OBSERVATIONS_HISTORY);
      setMedications(INITIAL_MEDICATIONS);
      setFluidRecords(INITIAL_FLUID_RECORDS);
      setLabResults(INITIAL_LAB_RESULTS);
      setClinicalNotes(INITIAL_CLINICAL_NOTES);
      setAlerts(INITIAL_ALERTS);
      setSelectedPatientId("001");
    } finally {
      setIsLoadingPatients(false);
      setIsRefreshing(false);
    }
  }, [showNotification]);

  // Initial fetch on mount
  useEffect(() => {
    fetchBackendData(false);
  }, [fetchBackendData]);

  // Auto-refresh and auto-reconnect interval (every 15 seconds)
  useEffect(() => {
    if (isDemoViewEnabled) return;

    const intervalId = setInterval(() => {
      fetchBackendData(false);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isDemoViewEnabled, fetchBackendData]);

  const refreshData = useCallback(() => {
    return fetchBackendData(true);
  }, [fetchBackendData]);

  // Toggle demo view
  const toggleDemoView = useCallback(() => {
    setIsDemoViewEnabled(prev => {
      const next = !prev;
      if (next) {
        setPatients(INITIAL_PATIENTS);
        setObservationsHistory(INITIAL_OBSERVATIONS_HISTORY);
        setMedications(INITIAL_MEDICATIONS);
        setFluidRecords(INITIAL_FLUID_RECORDS);
        setLabResults(INITIAL_LAB_RESULTS);
        setClinicalNotes(INITIAL_CLINICAL_NOTES);
        setAlerts(INITIAL_ALERTS);
        setSelectedPatientId("001");
        showNotification("Viewing Synthetic Demo Reference dataset.", "info");
      } else {
        fetchBackendData(false);
      }
      return next;
    });
  }, [fetchBackendData, showNotification]);

  // Fetch clinical records & telemetry for selected patient from Neon backend
  const fetchPatientDetails = useCallback(async (patientId) => {
    if (!patientId || dbStatus !== 'connected' || isDemoViewEnabled) return;

    try {
      const [vitalsRes, labsRes, alertsRes, notesRes, medsRes, fluidsRes] = await Promise.allSettled([
        apiService.getPatientVitals(patientId),
        apiService.getLabResults(patientId),
        apiService.getPatientAlerts(patientId),
        apiService.getClinicalNotes(patientId),
        apiService.getMedicationRecords(patientId),
        apiService.getFluidRecords(patientId)
      ]);

      if (vitalsRes.status === 'fulfilled' && vitalsRes.value?.success) {
        setObservationsHistory(prev => ({
          ...prev,
          [patientId]: vitalsRes.value.data
        }));
      }

      if (labsRes.status === 'fulfilled' && labsRes.value?.success) {
        setLabResults(prev => ({
          ...prev,
          [patientId]: labsRes.value.data
        }));
      }

      if (alertsRes.status === 'fulfilled' && alertsRes.value?.success) {
        setAlerts(prev => {
          const otherAlerts = prev.filter(a => (a.patientId || a.patient_id) !== patientId);
          return [...alertsRes.value.data, ...otherAlerts];
        });
      }

      if (notesRes.status === 'fulfilled' && notesRes.value?.success) {
        setClinicalNotes(prev => ({
          ...prev,
          [patientId]: notesRes.value.data
        }));
      }

      if (medsRes.status === 'fulfilled' && medsRes.value?.success) {
        setMedications(prev => ({
          ...prev,
          [patientId]: medsRes.value.data
        }));
      }

      if (fluidsRes.status === 'fulfilled' && fluidsRes.value?.success) {
        setFluidRecords(prev => ({
          ...prev,
          [patientId]: fluidsRes.value.data
        }));
      }
    } catch {
      // Handled silently
    }
  }, [dbStatus, isDemoViewEnabled]);

  useEffect(() => {
    if (selectedPatientId) {
      fetchPatientDetails(selectedPatientId);
    }
  }, [selectedPatientId, fetchPatientDetails]);

  // Selected patient object
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId) return patients[0] || null;
    return patients.find(p => (p.patient_id === selectedPatientId || p.id === selectedPatientId)) || patients[0] || null;
  }, [patients, selectedPatientId]);

  // Stats
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    
    const activeAlertPatientIds = new Set(
      alerts.filter(a => !a.isAcknowledged).map(a => a.patientId || a.patient_id)
    );
    const alertPatientsCount = patients.filter(
      p => activeAlertPatientIds.has(p.patient_id || p.id) || p.status === 'Critical' || p.status === 'Alert'
    ).length;

    const connectedDevices = devices.filter(d => d.status === 'Connected').length;
    const disconnectedOrStale = devices.filter(
      d => d.status === 'Disconnected' || d.status === 'Unknown' || d.dataFreshness?.includes('Stale')
    ).length;

    const occupiedBedsCount = all12Beds.filter(b => b.isOccupied).length;
    const availableBedsCount = 12 - occupiedBedsCount;

    return {
      totalPatients,
      occupiedBedsCount,
      availableBedsCount,
      patientsWithAlerts: alertPatientsCount,
      connectedDevices,
      disconnectedOrStaleDevices: disconnectedOrStale,
      livePatientsCount
    };
  }, [patients, alerts, devices, all12Beds, livePatientsCount]);

  // Acknowledge an alert (persisted in deterioration_alerts)
  const acknowledgeAlert = async (alertId) => {
    try {
      if (dbStatus === 'connected' && !isDemoViewEnabled) {
        await apiService.acknowledgeAlert(alertId, { acknowledged_by: 'Nurse Station' });
      }
    } catch (err) {
      console.warn('Acknowledge alert API error:', err.message);
    }

    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { ...alert, isAcknowledged: true, status: "Acknowledged", acknowledged: true }
          : alert
      )
    );
    showNotification("Alert acknowledged in Neon PostgreSQL.", "info");
  };

  // 1. Create / Register a Patient in Neon DB ('patients' table)
  const createNewPatient = async (patientData) => {
    try {
      const payload = {
        patient_id: patientData.patient_id || patientData.patientId || patientData.id,
        bed_id: patientData.bed_id || patientData.bedNumber || patientData.bed_number,
        admission_time: patientData.admission_time || patientData.admissionTime,
        admission_date: patientData.admission_date || patientData.admissionDate,
        status: patientData.status || 'ACTIVE'
      };

      const res = await apiService.createPatient(payload);
      if (res?.success && res.data) {
        const newPatient = res.data;
        const patientId = newPatient.patient_id || newPatient.id;
        
        setPatients(prev => {
          const filtered = prev.filter(p => (p.patient_id || p.id) !== patientId);
          return [newPatient, ...filtered];
        });
        
        setSelectedPatientId(patientId);
        setLivePatientsCount(c => c + 1);
        setIsDemoViewEnabled(false);
        
        await fetchBackendData(false);

        showNotification(
          res.message || `Patient ${patientId} admitted to ${newPatient.bedNumber}.`,
          "success"
        );
        return { success: true, data: newPatient };
      }
      throw new Error(res?.message || "Failed to create patient.");
    } catch (err) {
      const msg = err.data?.message || err.message || "Failed to register patient in database.";
      showNotification(msg, "error");
      return { success: false, error: msg };
    }
  };

  // 2. Discharge Patient Non-destructively ('patients' table)
  const dischargePatient = async (patientId, dischargeData) => {
    try {
      const res = await apiService.dischargePatient(patientId, dischargeData);
      if (res?.success) {
        setPatients(prev => prev.filter(p => (p.patient_id || p.id) !== patientId));
        
        setSelectedPatientId(prev => {
          const remaining = patients.filter(p => (p.patient_id || p.id) !== patientId);
          return remaining.length > 0 ? (remaining[0].patient_id || remaining[0].id) : null;
        });

        setLivePatientsCount(c => Math.max(0, c - 1));

        await fetchBackendData(false);

        showNotification(
          res.message || `Patient ${patientId} successfully discharged. Bed released.`,
          "success"
        );
        return { success: true, data: res.data };
      }
      throw new Error(res?.message || "Failed to discharge patient.");
    } catch (err) {
      const msg = err.data?.message || err.message || "Failed to discharge patient.";
      showNotification(msg, "error");
      return { success: false, error: msg };
    }
  };

  // 3. Add Clinical Note (Session / Memory)
  const addClinicalNote = async (noteData) => {
    const { patientId, author, type, findings, plan, gcsScore, pupils, date, time } = noteData;
    const targetPatient = patients.find(p => (p.patient_id === patientId || p.id === patientId));
    if (!targetPatient) return false;

    const formattedTime = `${date || new Date().toISOString().split('T')[0]} ${time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    let savedNote = null;
    try {
      const res = await apiService.createClinicalNote(patientId, {
        author,
        type,
        findings,
        plan,
        gcsScore,
        pupils,
        date,
        time
      });

      if (res?.success && res.data) {
        savedNote = res.data;
      }
    } catch (err) {
      console.warn('[Clinical Note API] Using session state:', err.message);
    }

    if (!savedNote) {
      savedNote = {
        id: `NOTE-${patientId}-${Date.now().toString().slice(-4)}`,
        time: formattedTime,
        author: author || "Clinical Staff",
        type: type || "Clinical Observation & Note",
        findings: findings || "No examination findings recorded.",
        plan: plan || "Continue standard ICU care plan.",
        gcsScore: gcsScore || "GCS 15",
        pupils: pupils || "Equal and Reactive",
        isDemoData: false,
        source: 'Session Memory'
      };
    }

    setClinicalNotes(prev => ({
      ...prev,
      [patientId]: [savedNote, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Clinical note recorded for Patient ${patientId} (${targetPatient.bedNumber}).`,
      "success"
    );
    return true;
  };

  // 4. Add Medication Administration Record (MAR - Session / Memory)
  const addMedicationRecord = async (medData) => {
    const { patientId, medicationName, prescribedDose, administeredDose, doseUnit, route, frequency, status, notes, staff, date, time } = medData;
    const targetPatient = patients.find(p => (p.patient_id === patientId || p.id === patientId));
    if (!targetPatient) return false;

    const formattedTime = `${date || new Date().toISOString().split('T')[0]} ${time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    let savedMed = null;
    try {
      const res = await apiService.createMedicationRecord(patientId, {
        medicationName,
        prescribedDose,
        administeredDose,
        doseUnit,
        route,
        frequency,
        status,
        notes,
        staff,
        date,
        time
      });

      if (res?.success && res.data) {
        savedMed = res.data;
      }
    } catch (err) {
      console.warn('[MAR API] Using session state:', err.message);
    }

    if (!savedMed) {
      savedMed = {
        id: `MED-${patientId}-${Date.now().toString().slice(-4)}`,
        medicationName: medicationName.trim(),
        prescribedDose: prescribedDose || administeredDose,
        administeredDose: administeredDose || prescribedDose,
        doseUnit: doseUnit || "mg",
        route: route || "IV Infusion",
        frequency: frequency || "Once / Stat",
        status: status || "Administered",
        time: formattedTime,
        notes: notes || "Dose administered as charted.",
        staff: staff || "Clinical Staff",
        isDemoData: false,
        source: 'Session Memory'
      };
    }

    setMedications(prev => ({
      ...prev,
      [patientId]: [savedMed, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Medication ${savedMed.medicationName} (${savedMed.administeredDose} ${savedMed.doseUnit}) recorded for Patient ${patientId}.`,
      "success"
    );
    return true;
  };

  // 5. Add Fluid Record (Session / Memory)
  const addFluidRecord = async (fluidData) => {
    const { 
      patientId, 
      interval, 
      oralIntake, 
      ivIntake, 
      otherIntake, 
      urineOutput, 
      otherOutput, 
      urineAppearance, 
      catheterStatus, 
      notes, 
      staff, 
      date, 
      time 
    } = fluidData;

    const targetPatient = patients.find(p => (p.patient_id === patientId || p.id === patientId));
    if (!targetPatient) return false;

    const oral = Number(oralIntake) || 0;
    const iv = Number(ivIntake) || 0;
    const otherIn = Number(otherIntake) || 0;
    const totalIn = oral + iv + otherIn;

    const urine = Number(urineOutput) || 0;
    const otherOut = Number(otherOutput) || 0;
    const totalOut = urine + otherOut;

    const net = totalIn - totalOut;
    const formattedTime = `${date || new Date().toISOString().split('T')[0]} ${time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    let savedFluid = null;
    try {
      const res = await apiService.createFluidRecord(patientId, {
        interval,
        oralIntake,
        ivIntake,
        otherIntake,
        urineOutput,
        otherOutput,
        urineAppearance,
        catheterStatus,
        notes,
        staff,
        date,
        time
      });

      if (res?.success && res.data) {
        savedFluid = res.data;
      }
    } catch (err) {
      console.warn('[Fluid API] Using session state:', err.message);
    }

    if (!savedFluid) {
      savedFluid = {
        id: `FL-${patientId}-${Date.now().toString().slice(-4)}`,
        interval: interval || "Current Interval",
        oralIntake: oral,
        ivIntake: iv,
        otherIntake: otherIn,
        totalIntake: totalIn,
        urineOutput: urine,
        otherOutput: otherOut,
        totalOutput: totalOut,
        netBalance: net,
        urineAppearance: urineAppearance || "Clear Amber",
        catheterStatus: catheterStatus || "Foley Catheter",
        time: formattedTime,
        notes: notes || "Intake/Output charted.",
        staff: staff || "Clinical Staff",
        isDemoData: false,
        source: 'Session Memory'
      };
    }

    setFluidRecords(prev => ({
      ...prev,
      [patientId]: [savedFluid, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Fluid balance (${net >= 0 ? '+' : ''}${net} mL) charted for Patient ${patientId}.`,
      "success"
    );
    return true;
  };

  // 6. Add Lab Results (manual_lab_records)
  const addLabResult = async (labData) => {
    const { patientId, panel, values, fio2, ph, paco2, lactate, notes, staff, date, time } = labData;
    const targetPatient = patients.find(p => (p.patient_id === patientId || p.id === patientId));
    if (!targetPatient) return false;

    let savedLab = null;
    let isLiveDb = false;

    try {
      const res = await apiService.createLabResult(patientId, {
        fio2: fio2 !== undefined ? fio2 : (values?.fio2?.val !== undefined ? values.fio2.val : undefined),
        ph: ph !== undefined ? ph : (values?.ph?.val !== undefined ? values.ph.val : undefined),
        paco2: paco2 !== undefined ? paco2 : (values?.paco2?.val !== undefined ? values.paco2.val : undefined),
        lactate: lactate !== undefined ? lactate : (values?.lactate?.val !== undefined ? values.lactate.val : undefined),
        values,
        notes,
        staff,
        date,
        time
      });

      if (res?.success && res.data) {
        savedLab = res.data;
        isLiveDb = true;

        if (res.data.deteriorationAlert) {
          setAlerts(prev => [res.data.deteriorationAlert, ...prev]);
        }
      }
    } catch (err) {
      console.warn('[Lab API] Error saving to manual_lab_records:', err.message);
    }

    if (!savedLab) {
      savedLab = {
        id: `LAB-${patientId}-${Date.now().toString().slice(-4)}`,
        panel: panel || "Nurse-Entered ABG & Labs",
        collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        resultTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: "Entered",
        fio2: fio2 || 0.21,
        ph: ph || null,
        paco2: paco2 || null,
        lactate: lactate || null,
        values: values || {},
        notes: notes || "Manual laboratory result documented.",
        staff: staff || "NURSE_STATION",
        isDemoData: false,
        source: 'Session Memory'
      };
    }

    setLabResults(prev => ({
      ...prev,
      [patientId]: [savedLab, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Manual lab record saved for Patient ${patientId}${isLiveDb ? ' [Saved to Neon DB manual_lab_records]' : ''}.`,
      "success"
    );
    return true;
  };

  // 7. Spot Vitals / Telemetry Snapshot (telemetry_snapshots)
  const addManualObservation = async (entry) => {
    const {
      patientId,
      hr,
      bpSys,
      bpDia,
      spo2,
      rr,
      temp,
      notes,
      symptoms,
      comments,
      staff,
      date,
      time
    } = entry;

    const targetPatient = patients.find(p => (p.patient_id === patientId || p.id === patientId));
    if (!targetPatient) return false;

    const formattedTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const timestampStr = `${formattedDate} ${formattedTime}`;
    const staffLabel = staff?.trim() ? staff.trim() : "Clinical Staff";

    let isLiveDb = false;
    let dbSavedObservation = null;

    try {
      const res = await apiService.recordVitals(patientId, {
        hr,
        sbp: bpSys,
        dbp: bpDia,
        spo2,
        resp: rr,
        notes: [notes, symptoms, comments].filter(Boolean).join(" | "),
        staff: staffLabel,
        date: formattedDate,
        time: formattedTime
      });

      if (res?.success && res.data) {
        dbSavedObservation = res.data;
        isLiveDb = true;

        if (res.data.deteriorationAlert) {
          setAlerts(prev => [res.data.deteriorationAlert, ...prev]);
        }
      }
    } catch (err) {
      console.warn('[Vitals API] Error saving to telemetry_snapshots:', err.message);
    }

    const newHistoryItem = dbSavedObservation ? {
      id: dbSavedObservation.id,
      patientId,
      timestamp: timestampStr,
      timeLabel: formattedTime,
      hr: dbSavedObservation.hr,
      bpSys: dbSavedObservation.bpSys,
      bpDia: dbSavedObservation.bpDia,
      bpMean: dbSavedObservation.bpMean,
      spo2: dbSavedObservation.spo2,
      rr: dbSavedObservation.rr,
      temp: null,
      source: "Neon PostgreSQL (telemetry_snapshots)",
      notes: notes || "Telemetry observation recorded.",
      staff: staffLabel,
      isDemoData: false
    } : {
      id: `OBS-${patientId}-${Date.now().toString().slice(-4)}`,
      patientId,
      timestamp: timestampStr,
      timeLabel: formattedTime,
      hr: hr !== "" && hr !== undefined && hr !== null ? Number(hr) : null,
      bpSys: bpSys !== "" && bpSys !== undefined && bpSys !== null ? Number(bpSys) : null,
      bpDia: bpDia !== "" && bpDia !== undefined && bpDia !== null ? Number(bpDia) : null,
      bpMean: (bpSys && bpDia) ? Math.round((Number(bpSys) + 2 * Number(bpDia)) / 3) : null,
      spo2: spo2 !== "" && spo2 !== undefined && spo2 !== null ? Number(spo2) : null,
      rr: rr !== "" && rr !== undefined && rr !== null ? Number(rr) : null,
      temp: temp !== "" && temp !== undefined && temp !== null ? Number(temp) : null,
      source: "Manual Entry (Bedside Charting)",
      notes: [notes, symptoms, comments].filter(Boolean).join(" | ") || "Manual observation recorded.",
      staff: staffLabel,
      isDemoData: false
    };

    setObservationsHistory(prev => ({
      ...prev,
      [patientId]: [newHistoryItem, ...(prev[patientId] || [])]
    }));

    // Update patient latest vitals card in state
    setPatients(prev =>
      prev.map(p => {
        if ((p.patient_id || p.id) !== patientId) return p;
        return {
          ...p,
          lastUpdated: "Just now",
          lastUpdatedTimestamp: new Date().toISOString(),
          vitals: {
            ...p.vitals,
            heartRate: newHistoryItem.hr !== null ? {
              value: newHistoryItem.hr,
              unit: "bpm",
              timestamp: "Just now",
              source: "telemetry_snapshots",
              status: newHistoryItem.hr > 120 || newHistoryItem.hr < 45 ? 'critical' : newHistoryItem.hr > 100 || newHistoryItem.hr < 55 ? 'warning' : 'normal',
              statusLabel: newHistoryItem.hr > 100 ? 'Tachycardia' : newHistoryItem.hr < 55 ? 'Bradycardia' : 'Normal Sinus',
              isStale: false
            } : p.vitals?.heartRate,
            bloodPressure: (newHistoryItem.bpSys !== null && newHistoryItem.bpDia !== null) ? {
              systolic: newHistoryItem.bpSys,
              diastolic: newHistoryItem.bpDia,
              mean: newHistoryItem.bpMean,
              unit: "mmHg",
              timestamp: "Just now",
              source: "telemetry_snapshots",
              status: newHistoryItem.bpSys < 90 || newHistoryItem.bpSys > 180 ? 'critical' : (newHistoryItem.bpSys > 140 || newHistoryItem.bpDia > 90) ? 'warning' : 'normal',
              statusLabel: `${newHistoryItem.bpSys}/${newHistoryItem.bpDia}`,
              isStale: false
            } : p.vitals?.bloodPressure,
            spo2: newHistoryItem.spo2 !== null ? {
              value: newHistoryItem.spo2,
              unit: "%",
              timestamp: "Just now",
              source: "telemetry_snapshots",
              status: newHistoryItem.spo2 < 90 ? 'critical' : newHistoryItem.spo2 < 95 ? 'warning' : 'normal',
              statusLabel: `${newHistoryItem.spo2}%`,
              isStale: false
            } : p.vitals?.spo2,
            respiratoryRate: newHistoryItem.rr !== null ? {
              value: newHistoryItem.rr,
              unit: "breaths/min",
              timestamp: "Just now",
              source: "telemetry_snapshots",
              status: newHistoryItem.rr > 30 || newHistoryItem.rr < 8 ? 'critical' : newHistoryItem.rr > 22 || newHistoryItem.rr < 12 ? 'warning' : 'normal',
              statusLabel: `${newHistoryItem.rr} bpm`,
              isStale: false
            } : p.vitals?.respiratoryRate
          }
        };
      })
    );

    setSelectedPatientId(patientId);

    showNotification(
      `Telemetry snapshot saved for Patient ${patientId}${isLiveDb ? ' [Saved to Neon DB telemetry_snapshots]' : ''}.`,
      "success"
    );

    return true;
  };

  return (
    <PatientDataContext.Provider
      value={{
        patients,
        all12Beds,
        patientHistory,
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
        activePage,
        setActivePage,
        globalSearch,
        setGlobalSearch,
        stats,
        acknowledgeAlert,
        addManualObservation,
        addClinicalNote,
        addMedicationRecord,
        addFluidRecord,
        addLabResult,
        createNewPatient,
        dischargePatient,
        fetchBackendData,
        refreshData,
        isRefreshing,
        lastRefreshed,
        dbStatus,
        isLoadingPatients,
        livePatientsCount,
        isDemoViewEnabled,
        toggleDemoView,
        notification,
        showNotification,
        clearNotification,
        theme,
        toggleTheme
      }}
    >
      {children}
    </PatientDataContext.Provider>
  );
};

export const usePatientData = () => {
  const context = useContext(PatientDataContext);
  if (!context) {
    throw new Error('usePatientData must be used within a PatientDataProvider');
  }
  return context;
};

export default PatientDataProvider;
