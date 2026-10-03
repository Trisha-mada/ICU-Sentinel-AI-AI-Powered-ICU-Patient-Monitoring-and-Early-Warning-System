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

  // Track latest fetch request timestamp to prevent out-of-order response overwrite
  const latestFetchTimestamp = useRef(0);

  // Theme State: 'light' | 'dark' with localStorage persistence
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('icu_sentinel_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  // Apply theme attribute to document element
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('icu_sentinel_theme', theme);
    } catch {
      // Fallback if localStorage unavailable
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Helper to trigger temporary UI feedback notification
  const showNotification = useCallback((message, type = "success") => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const clearNotification = () => setNotification(null);

  // Fetch all patients, 12 beds status, and history from Backend / Neon PostgreSQL
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
        
        // Concurrently fetch active patients, 12 beds status, and history
        const [patientsRes, bedsRes, historyRes] = await Promise.allSettled([
          apiService.getPatients(),
          apiService.getBedStatuses(),
          apiService.getPatientHistory()
        ]);

        // Guard against out-of-order resolution
        if (latestFetchTimestamp.current !== fetchId) return;

        // 1. Process 12 Beds
        if (bedsRes.status === 'fulfilled' && bedsRes.value?.success && Array.isArray(bedsRes.value.data)) {
          setAll12Beds(bedsRes.value.data);
        }

        // 2. Process Discharged Patients History
        if (historyRes.status === 'fulfilled' && historyRes.value?.success && Array.isArray(historyRes.value.data)) {
          setPatientHistory(historyRes.value.data);
        }

        // 3. Process Active Patients List
        if (patientsRes.status === 'fulfilled' && patientsRes.value?.success && Array.isArray(patientsRes.value.data)) {
          const dbPatients = patientsRes.value.data;
          setLivePatientsCount(dbPatients.length);

          if (dbPatients.length > 0) {
            setPatients(dbPatients);
            setSelectedPatientId(prev => {
              if (prev && dbPatients.some(p => p.id === prev)) return prev;
              return dbPatients[0].id;
            });
          } else {
            // Neon DB has 0 active patients (all beds available)
            setPatients([]);
            setSelectedPatientId(null);
          }
        }

        setLastRefreshed(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        if (isManualRefresh) {
          showNotification("Dashboard and bed occupancy refreshed from Neon PostgreSQL.", "info");
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
        setSelectedPatientId("PT-101");
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
      setSelectedPatientId("PT-101");
    } finally {
      setIsLoadingPatients(false);
      setIsRefreshing(false);
    }
  }, [isLoadingPatients, showNotification]);

  // Initial fetch on mount
  useEffect(() => {
    fetchBackendData(false);
  }, []); // Run once on mount

  // Auto-refresh interval (every 20 seconds) while dashboard is mounted
  useEffect(() => {
    if (isDemoViewEnabled || dbStatus === 'offline') return;

    const intervalId = setInterval(() => {
      fetchBackendData(false);
    }, 20000);

    return () => clearInterval(intervalId);
  }, [isDemoViewEnabled, dbStatus, fetchBackendData]);

  // Manual refresh trigger
  const refreshData = useCallback(() => {
    return fetchBackendData(true);
  }, [fetchBackendData]);

  // Toggle demo view when in connected mode if user wants to inspect synthetic baseline
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
        setSelectedPatientId("PT-101");
        showNotification("Viewing Synthetic Demo Reference dataset.", "info");
      } else {
        fetchBackendData(false);
      }
      return next;
    });
  }, [fetchBackendData, showNotification]);

  // Fetch clinical records for selected patient from Neon backend
  const fetchPatientDetails = useCallback(async (patientId) => {
    if (!patientId || dbStatus !== 'connected' || isDemoViewEnabled) return;

    try {
      const [vitalsRes, notesRes, medsRes, fluidsRes, labsRes] = await Promise.allSettled([
        apiService.getPatientVitals(patientId),
        apiService.getClinicalNotes(patientId),
        apiService.getMedicationRecords(patientId),
        apiService.getFluidRecords(patientId),
        apiService.getLabResults(patientId)
      ]);

      if (vitalsRes.status === 'fulfilled' && vitalsRes.value?.success) {
        setObservationsHistory(prev => ({
          ...prev,
          [patientId]: vitalsRes.value.data
        }));
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

      if (labsRes.status === 'fulfilled' && labsRes.value?.success) {
        setLabResults(prev => ({
          ...prev,
          [patientId]: labsRes.value.data
        }));
      }
    } catch {
      // Background sync error handled silently
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
    return patients.find(p => p.id === selectedPatientId) || patients[0] || null;
  }, [patients, selectedPatientId]);

  // Derived counts for overview stats
  const stats = useMemo(() => {
    const totalPatients = patients.length;
    
    // Count active unacknowledged alerts or patients with Alert/Critical status
    const activeAlertPatientIds = new Set(
      alerts.filter(a => !a.isAcknowledged).map(a => a.patientId)
    );
    const alertPatientsCount = patients.filter(
      p => activeAlertPatientIds.has(p.id) || p.status === 'Critical' || p.status === 'Alert'
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

  // Acknowledge an alert
  const acknowledgeAlert = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId
          ? { ...alert, isAcknowledged: true, status: "Acknowledged" }
          : alert
      )
    );
    showNotification("Alert acknowledged.", "info");
  };

  // 1. Create / Register a Patient in Neon DB
  const createNewPatient = async (patientData) => {
    try {
      const res = await apiService.createPatient(patientData);
      if (res?.success && res.data) {
        const newPatient = res.data;
        
        // Update patient list
        setPatients(prev => {
          const filtered = prev.filter(p => p.id !== newPatient.id);
          return [newPatient, ...filtered];
        });
        
        setSelectedPatientId(newPatient.id);
        setLivePatientsCount(c => c + 1);
        setIsDemoViewEnabled(false);
        
        // Immediately refresh beds and patient roster
        await fetchBackendData(false);

        showNotification(
          res.message || `Patient ${newPatient.name} (ID: ${newPatient.id}) registered and admitted to ${newPatient.bedNumber}.`,
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

  // 2. Discharge Patient Non-destructively
  const dischargePatient = async (patientId, dischargeData) => {
    try {
      const res = await apiService.dischargePatient(patientId, dischargeData);
      if (res?.success) {
        // Remove discharged patient from active list
        setPatients(prev => prev.filter(p => p.id !== patientId));
        
        // Select next available patient
        setSelectedPatientId(prev => {
          const remaining = patients.filter(p => p.id !== patientId);
          return remaining.length > 0 ? remaining[0].id : null;
        });

        setLivePatientsCount(c => Math.max(0, c - 1));

        // Immediately refresh beds status & history from live DB
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

  // 3. Add Clinical / Nursing Note
  const addClinicalNote = async (noteData) => {
    const { patientId, author, type, findings, plan, gcsScore, pupils, date, time } = noteData;
    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) return false;

    const formattedTime = `${date || new Date().toISOString().split('T')[0]} ${time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    let savedNote = null;
    let isLiveDb = false;

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
        isLiveDb = true;
      }
    } catch (err) {
      console.warn('[Clinical Note API] Falling back to local state:', err.message);
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
        isDemoData: true,
        source: 'Local Memory (Uncommitted)'
      };
    }

    setClinicalNotes(prev => ({
      ...prev,
      [patientId]: [savedNote, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Clinical note recorded for ${targetPatient.name} (${targetPatient.bedNumber})${isLiveDb ? ' [Saved to Neon DB]' : ''}.`,
      "success"
    );
    return true;
  };

  // 4. Add Medication Administration Record (MAR)
  const addMedicationRecord = async (medData) => {
    const { patientId, medicationName, prescribedDose, administeredDose, doseUnit, route, frequency, status, notes, staff, date, time } = medData;
    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) return false;

    const formattedTime = `${date || new Date().toISOString().split('T')[0]} ${time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    
    let savedMed = null;
    let isLiveDb = false;

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
        isLiveDb = true;
      }
    } catch (err) {
      console.warn('[MAR API] Falling back to local state:', err.message);
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
        isDemoData: true,
        source: 'Local Memory (Uncommitted)'
      };
    }

    setMedications(prev => ({
      ...prev,
      [patientId]: [savedMed, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Medication ${savedMed.medicationName} (${savedMed.administeredDose} ${savedMed.doseUnit}) recorded for ${targetPatient.name}${isLiveDb ? ' [Saved to Neon DB]' : ''}.`,
      "success"
    );
    return true;
  };

  // 5. Add Fluid Intake & Output & Urine Record
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

    const targetPatient = patients.find(p => p.id === patientId);
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
    let isLiveDb = false;

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
        isLiveDb = true;
      }
    } catch (err) {
      console.warn('[Fluid API] Falling back to local state:', err.message);
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
        isDemoData: true,
        source: 'Local Memory (Uncommitted)'
      };
    }

    setFluidRecords(prev => ({
      ...prev,
      [patientId]: [savedFluid, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Fluid balance (${net >= 0 ? '+' : ''}${net} mL) charted for ${targetPatient.name}${isLiveDb ? ' [Saved to Neon DB]' : ''}.`,
      "success"
    );
    return true;
  };

  // 6. Add Lab & ABG Results
  const addLabResult = async (labData) => {
    const { patientId, panel, values, collectionTime, resultTime, notes, staff } = labData;
    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) return false;

    let savedLab = null;
    let isLiveDb = false;

    try {
      const res = await apiService.createLabResult(patientId, {
        panel,
        values,
        collectionTime,
        resultTime,
        notes,
        staff
      });

      if (res?.success && res.data) {
        savedLab = res.data;
        isLiveDb = true;
      }
    } catch (err) {
      console.warn('[Lab API] Falling back to local state:', err.message);
    }

    if (!savedLab) {
      savedLab = {
        id: `LAB-${patientId}-${Date.now().toString().slice(-4)}`,
        panel: panel || "Manual Laboratory Entry",
        collectionTime: collectionTime || new Date().toISOString().replace('T', ' ').slice(0, 16),
        resultTime: resultTime || new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: "Entered",
        values: values || {},
        notes: notes || "Manual laboratory result documented.",
        staff: staff || "Clinical Staff",
        isDemoData: true,
        source: 'Local Memory (Uncommitted)'
      };
    }

    setLabResults(prev => ({
      ...prev,
      [patientId]: [savedLab, ...(prev[patientId] || [])]
    }));

    showNotification(
      `Laboratory results recorded for ${targetPatient.name}${isLiveDb ? ' [Saved to Neon DB]' : ''}.`,
      "success"
    );
    return true;
  };

  // 7. Spot Vitals / Manual Observation
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

    const targetPatient = patients.find(p => p.id === patientId);
    if (!targetPatient) return false;

    const formattedTime = time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const formattedDate = date || new Date().toISOString().split('T')[0];
    const timestampStr = `${formattedDate} ${formattedTime}`;
    const staffLabel = staff?.trim() ? staff.trim() : "Clinical Staff (Manual)";

    let isLiveDb = false;
    let dbSavedObservation = null;

    try {
      const res = await apiService.recordVitals(patientId, {
        hr,
        bpSys,
        bpDia,
        spo2,
        rr,
        temp,
        notes: [notes, symptoms, comments].filter(Boolean).join(" | "),
        staff: staffLabel,
        date: formattedDate,
        time: formattedTime
      });

      if (res?.success && res.data) {
        dbSavedObservation = res.data;
        isLiveDb = true;
      }
    } catch (err) {
      console.warn('[Vitals API] Falling back to local state:', err.message);
    }

    const newHistoryItem = dbSavedObservation ? {
      id: dbSavedObservation.id,
      timestamp: timestampStr,
      timeLabel: formattedTime,
      hr: dbSavedObservation.hr,
      bpSys: dbSavedObservation.bpSys,
      bpDia: dbSavedObservation.bpDia,
      spo2: dbSavedObservation.spo2,
      rr: dbSavedObservation.rr,
      temp: dbSavedObservation.temp,
      source: dbSavedObservation.source || "Neon PostgreSQL (Live DB)",
      notes: dbSavedObservation.notes || [notes, symptoms, comments].filter(Boolean).join(" | ") || "Manual observation recorded by staff.",
      staff: dbSavedObservation.staffName || staffLabel,
      isDemoData: false
    } : {
      id: `OBS-${patientId}-${Date.now().toString().slice(-4)}`,
      timestamp: timestampStr,
      timeLabel: formattedTime,
      hr: hr !== "" && hr !== undefined && hr !== null ? Number(hr) : null,
      bpSys: bpSys !== "" && bpSys !== undefined && bpSys !== null ? Number(bpSys) : null,
      bpDia: bpDia !== "" && bpDia !== undefined && bpDia !== null ? Number(bpDia) : null,
      spo2: spo2 !== "" && spo2 !== undefined && spo2 !== null ? Number(spo2) : null,
      rr: rr !== "" && rr !== undefined && rr !== null ? Number(rr) : null,
      temp: temp !== "" && temp !== undefined && temp !== null ? Number(temp) : null,
      source: "Manual Entry (Bedside Charting)",
      notes: [notes, symptoms, comments].filter(Boolean).join(" | ") || "Manual observation recorded by staff.",
      staff: staffLabel,
      isDemoData: true
    };

    setObservationsHistory(prev => ({
      ...prev,
      [patientId]: [newHistoryItem, ...(prev[patientId] || [])]
    }));

    let newStatus = targetPatient.status;
    let newAlertsToPush = [];

    // HR Rule
    let hrObj = targetPatient.vitals?.heartRate || {};
    if (newHistoryItem.hr !== null) {
      let hrStatus = "normal";
      let hrLabel = "Normal Sinus (60-100)";
      if (newHistoryItem.hr > 120 || newHistoryItem.hr < 45) {
        hrStatus = "critical";
        hrLabel = newHistoryItem.hr > 120 ? "Severe Tachycardia (>120)" : "Severe Bradycardia (<45)";
        newStatus = "Critical";
      } else if (newHistoryItem.hr > 100 || newHistoryItem.hr < 55) {
        hrStatus = "warning";
        hrLabel = newHistoryItem.hr > 100 ? "Tachycardia (>100)" : "Bradycardia (<55)";
        if (newStatus !== "Critical") newStatus = "Alert";
      }
      hrObj = {
        value: newHistoryItem.hr,
        unit: "bpm",
        timestamp: "Just now (Manual)",
        source: isLiveDb ? `Neon DB (${staffLabel})` : `Manual Entry (${staffLabel})`,
        status: hrStatus,
        statusLabel: hrLabel,
        isStale: false
      };
    }

    // BP Rule
    let bpObj = targetPatient.vitals?.bloodPressure || {};
    if (newHistoryItem.bpSys !== null && newHistoryItem.bpDia !== null) {
      let bpStatus = "normal";
      let bpLabel = "Within Normal Range (90-140 / 60-90)";
      if (newHistoryItem.bpSys < 90 || newHistoryItem.bpSys > 180) {
        bpStatus = "critical";
        bpLabel = newHistoryItem.bpSys < 90 ? "Hypotension (SBP < 90)" : "Hypertensive Crisis (SBP > 180)";
        newStatus = "Critical";
      } else if (newHistoryItem.bpSys > 140 || newHistoryItem.bpDia > 90) {
        bpStatus = "warning";
        bpLabel = "Hypertension (SBP > 140 or DBP > 90)";
        if (newStatus !== "Critical") newStatus = "Alert";
      }
      bpObj = {
        systolic: newHistoryItem.bpSys,
        diastolic: newHistoryItem.bpDia,
        mean: Math.round((newHistoryItem.bpSys + 2 * newHistoryItem.bpDia) / 3),
        unit: "mmHg",
        timestamp: "Just now (Manual)",
        source: isLiveDb ? `Neon DB (${staffLabel})` : `Manual Entry (${staffLabel})`,
        status: bpStatus,
        statusLabel: bpLabel,
        isStale: false
      };
    }

    // SpO2 Rule
    let spo2Obj = targetPatient.vitals?.spo2 || {};
    if (newHistoryItem.spo2 !== null) {
      let spo2Status = "normal";
      let spo2Label = "Adequate Oxygenation (≥95%)";
      if (newHistoryItem.spo2 < 90) {
        spo2Status = "critical";
        spo2Label = "Severe Hypoxemia (SpO₂ < 90%)";
        newStatus = "Critical";
        newAlertsToPush.push({
          id: `ALT-MAN-${Date.now()}`,
          patientId,
          patientName: targetPatient.name,
          bedNumber: targetPatient.bedNumber,
          severity: "high",
          parameter: "SpO₂ (Manual Entry)",
          description: `SpO₂ entered as ${newHistoryItem.spo2}%`,
          timestamp: "Just now",
          status: "Active",
          isAcknowledged: false
        });
      } else if (newHistoryItem.spo2 < 94) {
        spo2Status = "warning";
        spo2Label = "Mild Hypoxemia (SpO₂ < 94%)";
        if (newStatus !== "Critical") newStatus = "Alert";
      }
      spo2Obj = {
        value: newHistoryItem.spo2,
        unit: "%",
        timestamp: "Just now (Manual)",
        source: isLiveDb ? `Neon DB (${staffLabel})` : `Manual Entry (${staffLabel})`,
        status: spo2Status,
        statusLabel: spo2Label,
        isStale: false
      };
    }

    // RR Rule
    let rrObj = targetPatient.vitals?.respiratoryRate || {};
    if (newHistoryItem.rr !== null) {
      let rrStatus = "normal";
      let rrLabel = "Eupneic (12-20)";
      if (newHistoryItem.rr > 30 || newHistoryItem.rr < 8) {
        rrStatus = "critical";
        rrLabel = newHistoryItem.rr > 30 ? "Severe Tachypnea (RR > 30)" : "Bradypnea / Hypoventilation (RR < 8)";
        newStatus = "Critical";
      } else if (newHistoryItem.rr > 22 || newHistoryItem.rr < 12) {
        rrStatus = "warning";
        rrLabel = newHistoryItem.rr > 22 ? "Tachypnea (RR > 22)" : "Borderline Slow (RR < 12)";
        if (newStatus !== "Critical") newStatus = "Alert";
      }
      rrObj = {
        value: newHistoryItem.rr,
        unit: "breaths/min",
        timestamp: "Just now (Manual)",
        source: isLiveDb ? `Neon DB (${staffLabel})` : `Manual Entry (${staffLabel})`,
        status: rrStatus,
        statusLabel: rrLabel,
        isStale: false
      };
    }

    // Temp Rule
    let tempObj = targetPatient.vitals?.temperature || {};
    if (newHistoryItem.temp !== null) {
      let tempStatus = "normal";
      let tempLabel = "Normothermic (36.5-37.5°C)";
      if (newHistoryItem.temp >= 38.8 || newHistoryItem.temp < 35.0) {
        tempStatus = "critical";
        tempLabel = newHistoryItem.temp >= 38.8 ? "High Pyrexia (Temp ≥ 38.8°C)" : "Hypothermia (Temp < 35°C)";
        newStatus = "Critical";
        newAlertsToPush.push({
          id: `ALT-MAN-T-${Date.now()}`,
          patientId,
          patientName: targetPatient.name,
          bedNumber: targetPatient.bedNumber,
          severity: "high",
          parameter: "Temperature (Manual Entry)",
          description: `High Pyrexia ${newHistoryItem.temp}°C entered manually`,
          timestamp: "Just now",
          status: "Active",
          isAcknowledged: false
        });
      } else if (newHistoryItem.temp > 37.8) {
        tempStatus = "warning";
        tempLabel = "Low-grade Pyrexia (Temp > 37.8°C)";
        if (newStatus !== "Critical") newStatus = "Alert";
      }
      tempObj = {
        value: newHistoryItem.temp,
        unit: "°C",
        timestamp: "Just now (Manual)",
        source: isLiveDb ? `Neon DB (${staffLabel})` : `Manual Entry (${staffLabel})`,
        status: tempStatus,
        statusLabel: tempLabel,
        isStale: false
      };
    }

    setPatients(prev =>
      prev.map(p => {
        if (p.id !== patientId) return p;
        return {
          ...p,
          status: newStatus,
          lastUpdated: "Just now (Manual Entry)",
          lastUpdatedTimestamp: new Date().toISOString(),
          vitals: {
            ...p.vitals,
            heartRate: hrObj,
            bloodPressure: bpObj,
            spo2: spo2Obj,
            respiratoryRate: rrObj,
            temperature: tempObj
          }
        };
      })
    );

    if (newAlertsToPush.length > 0) {
      setAlerts(prev => [...newAlertsToPush, ...prev]);
    }

    setSelectedPatientId(patientId);

    showNotification(
      `Observation successfully recorded for ${targetPatient.name} (${targetPatient.bedNumber})${isLiveDb ? ' [Saved to Neon DB]' : ''}.`,
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
