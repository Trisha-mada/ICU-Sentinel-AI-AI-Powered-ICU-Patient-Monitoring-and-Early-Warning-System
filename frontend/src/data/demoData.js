/**
 * ICU Sentinel - Synthetic Clinical Demo Dataset
 * 
 * DISCLAIMER: ALL DATA CONTAINED HEREIN IS SYNTHETIC DEMONSTRATION DATA
 * FOR ACADEMIC PROTOTYPING PURPOSES. IT DOES NOT REPRESENT ACTUAL PATIENTS
 * OR CLINICALLY VALIDATED MEDICAL ADVICE.
 */

export const INITIAL_PATIENTS = [
  {
    id: "PT-101",
    name: "Eleanor Vance",
    age: 68,
    gender: "Female",
    bedNumber: "ICU-04",
    admissionDate: "2026-09-28",
    diagnosis: "Acute Respiratory Distress Syndrome (ARDS) post-CABG",
    status: "Alert", // "Critical" | "Alert" | "Stable" | "Observation"
    lastUpdated: "2 mins ago",
    lastUpdatedTimestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    isDemoData: true,
    ventilatorAttached: true,
    vitals: {
      heartRate: {
        value: 112,
        unit: "bpm",
        timestamp: "2 mins ago",
        source: "Mindray BeneVision N17 (Device)",
        status: "warning",
        statusLabel: "Tachycardia (Demo Rule: HR > 100)",
        isStale: false
      },
      bloodPressure: {
        systolic: 138,
        diastolic: 86,
        mean: 103,
        unit: "mmHg",
        timestamp: "2 mins ago",
        source: "Mindray BeneVision N17 (Device)",
        status: "normal",
        statusLabel: "Within range (Demo Rule: 90-140 / 60-90)",
        isStale: false
      },
      spo2: {
        value: 91,
        unit: "%",
        timestamp: "2 mins ago",
        source: "Mindray SpO₂ Sensor (Device)",
        status: "critical",
        statusLabel: "Hypoxemia (Demo Rule: SpO₂ < 92%)",
        isStale: false
      },
      respiratoryRate: {
        value: 26,
        unit: "breaths/min",
        timestamp: "2 mins ago",
        source: "Hamilton-G5 Ventilator (Device)",
        status: "warning",
        statusLabel: "Tachypnea (Demo Rule: RR > 22)",
        isStale: false
      },
      temperature: {
        value: 38.4,
        unit: "°C",
        timestamp: "25 mins ago",
        source: "Manual Entry (Nurse J. Miller)",
        status: "warning",
        statusLabel: "Pyrexia (Demo Rule: Temp > 38.0°C)",
        isStale: false
      },
      ventilatorParams: {
        mode: "PRVC (Pressure Regulated Volume Control)",
        peep: { value: 10, unit: "cmH₂O" },
        fio2: { value: 55, unit: "%" },
        tidalVolume: { value: 440, unit: "mL" },
        peakPressure: { value: 24, unit: "cmH₂O" },
        timestamp: "2 mins ago",
        source: "Hamilton-G5 Ventilator (Device)"
      }
    }
  },
  {
    id: "PT-102",
    name: "Marcus Wright",
    age: 54,
    gender: "Male",
    bedNumber: "ICU-02",
    admissionDate: "2026-09-30",
    diagnosis: "Severe Sepsis secondary to Pyelonephritis",
    status: "Critical",
    lastUpdated: "35 mins ago (Stale)",
    lastUpdatedTimestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    isDemoData: true,
    ventilatorAttached: false,
    vitals: {
      heartRate: {
        value: 124,
        unit: "bpm",
        timestamp: "35 mins ago",
        source: "Philips IntelliVue MX800 (Device)",
        status: "critical",
        statusLabel: "Severe Tachycardia (Demo Rule: HR > 120)",
        isStale: true
      },
      bloodPressure: {
        systolic: 84,
        diastolic: 52,
        mean: 62,
        unit: "mmHg",
        timestamp: "35 mins ago",
        source: "Philips IntelliVue MX800 (Device)",
        status: "critical",
        statusLabel: "Hypotension (Demo Rule: SBP < 90)",
        isStale: true
      },
      spo2: {
        value: 94,
        unit: "%",
        timestamp: "35 mins ago",
        source: "Philips IntelliVue MX800 (Device)",
        status: "normal",
        statusLabel: "Adequate (Demo Rule: ≥ 94%)",
        isStale: true
      },
      respiratoryRate: {
        value: 24,
        unit: "breaths/min",
        timestamp: "35 mins ago",
        source: "Philips IntelliVue MX800 (Device)",
        status: "warning",
        statusLabel: "Tachypnea (Demo Rule: RR > 20)",
        isStale: true
      },
      temperature: {
        value: 39.1,
        unit: "°C",
        timestamp: "40 mins ago",
        source: "Manual Entry (Dr. S. Lin)",
        status: "critical",
        statusLabel: "High Fever (Demo Rule: Temp > 38.8°C)",
        isStale: true
      }
    }
  },
  {
    id: "PT-103",
    name: "Clara Oswald",
    age: 41,
    gender: "Female",
    bedNumber: "ICU-01",
    admissionDate: "2026-10-01",
    diagnosis: "Post-Craniotomy for acute subdural hematoma",
    status: "Stable",
    lastUpdated: "5 mins ago",
    lastUpdatedTimestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    isDemoData: true,
    ventilatorAttached: false,
    vitals: {
      heartRate: {
        value: 74,
        unit: "bpm",
        timestamp: "5 mins ago",
        source: "GE Carescape B650 (Device)",
        status: "normal",
        statusLabel: "Normal Sinus (Demo Rule: 60-100)",
        isStale: false
      },
      bloodPressure: {
        systolic: 122,
        diastolic: 78,
        mean: 92,
        unit: "mmHg",
        timestamp: "5 mins ago",
        source: "GE Carescape B650 (Device)",
        status: "normal",
        statusLabel: "Normotensive (Demo Rule)",
        isStale: false
      },
      spo2: {
        value: 99,
        unit: "%",
        timestamp: "5 mins ago",
        source: "GE Carescape B650 (Device)",
        status: "normal",
        statusLabel: "Normal (Demo Rule: > 95%)",
        isStale: false
      },
      respiratoryRate: {
        value: 16,
        unit: "breaths/min",
        timestamp: "5 mins ago",
        source: "GE Carescape B650 (Device)",
        status: "normal",
        statusLabel: "Eupneic (Demo Rule: 12-20)",
        isStale: false
      },
      temperature: {
        value: 36.9,
        unit: "°C",
        timestamp: "1 hour ago",
        source: "Manual Entry (Nurse K. Patel)",
        status: "normal",
        statusLabel: "Normothermic (Demo Rule)",
        isStale: false
      }
    }
  },
  {
    id: "PT-104",
    name: "David Alvarez",
    age: 72,
    gender: "Male",
    bedNumber: "ICU-07",
    admissionDate: "2026-09-29",
    diagnosis: "Acute Coronary Syndrome (NSTEMI) with Cardiogenic Pulm. Edema",
    status: "Alert",
    lastUpdated: "12 mins ago",
    lastUpdatedTimestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    isDemoData: true,
    ventilatorAttached: true,
    vitals: {
      heartRate: {
        value: 98,
        unit: "bpm",
        timestamp: "12 mins ago",
        source: "Mindray BeneVision N17 (Device)",
        status: "normal",
        statusLabel: "Borderline High (Demo Rule)",
        isStale: false
      },
      bloodPressure: {
        systolic: 156,
        diastolic: 94,
        mean: 114,
        unit: "mmHg",
        timestamp: "12 mins ago",
        source: "Mindray BeneVision N17 (Device)",
        status: "warning",
        statusLabel: "Hypertension Stage 2 (Demo Rule: SBP > 150)",
        isStale: false
      },
      spo2: {
        value: 94,
        unit: "%",
        timestamp: "12 mins ago",
        source: "Mindray SpO₂ Sensor (Device)",
        status: "normal",
        statusLabel: "Acceptable on BiPAP (Demo Rule)",
        isStale: false
      },
      respiratoryRate: {
        value: 21,
        unit: "breaths/min",
        timestamp: "12 mins ago",
        source: "Draeger Evita V500 (Device)",
        status: "normal",
        statusLabel: "Acceptable (Demo Rule)",
        isStale: false
      },
      temperature: {
        value: 37.2,
        unit: "°C",
        timestamp: "2 hours ago",
        source: "Manual Entry (Nurse J. Miller)",
        status: "normal",
        statusLabel: "Normothermic (Demo Rule)",
        isStale: false
      },
      ventilatorParams: {
        mode: "NIV / BiPAP S/T",
        peep: { value: 6, unit: "cmH₂O" },
        fio2: { value: 40, unit: "%" },
        tidalVolume: { value: 500, unit: "mL" },
        peakPressure: { value: 16, unit: "cmH₂O" },
        timestamp: "12 mins ago",
        source: "Draeger Evita V500 (Device)"
      }
    }
  },
  {
    id: "PT-105",
    name: "Amina Begum",
    age: 60,
    gender: "Female",
    bedNumber: "ICU-05",
    admissionDate: "2026-10-02",
    diagnosis: "Diabetic Ketoacidosis (DKA) resolving with Insulin Infusion",
    status: "Observation",
    lastUpdated: "45 mins ago",
    lastUpdatedTimestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    isDemoData: true,
    ventilatorAttached: false,
    vitals: {
      heartRate: {
        value: 86,
        unit: "bpm",
        timestamp: "45 mins ago",
        source: "Manual Entry (Nurse T. Mada)",
        status: "normal",
        statusLabel: "Normal (Demo Rule)",
        isStale: false
      },
      bloodPressure: {
        systolic: 118,
        diastolic: 74,
        mean: 88,
        unit: "mmHg",
        timestamp: "45 mins ago",
        source: "Manual Entry (Nurse T. Mada)",
        status: "normal",
        statusLabel: "Normal (Demo Rule)",
        isStale: false
      },
      spo2: {
        value: 98,
        unit: "%",
        timestamp: "45 mins ago",
        source: "Manual Entry (Nurse T. Mada)",
        status: "normal",
        statusLabel: "Normal (Demo Rule)",
        isStale: false
      },
      respiratoryRate: {
        value: 18,
        unit: "breaths/min",
        timestamp: "45 mins ago",
        source: "Manual Entry (Nurse T. Mada)",
        status: "normal",
        statusLabel: "Normal (Demo Rule)",
        isStale: false
      },
      temperature: {
        value: 37.0,
        unit: "°C",
        timestamp: "45 mins ago",
        source: "Manual Entry (Nurse T. Mada)",
        status: "normal",
        statusLabel: "Normal (Demo Rule)",
        isStale: false
      }
    }
  }
];

export const INITIAL_OBSERVATIONS_HISTORY = {
  "PT-101": [
    {
      id: "OBS-101-1",
      timestamp: "2026-10-02 18:00",
      timeLabel: "18:00",
      hr: 98,
      bpSys: 124,
      bpDia: 78,
      spo2: 96,
      rr: 18,
      temp: 37.6,
      source: "Mindray Device",
      notes: "Patient resting comfortably after chest physiotherapy.",
      staff: "Auto Device Stream"
    },
    {
      id: "OBS-101-2",
      timestamp: "2026-10-02 19:30",
      timeLabel: "19:30",
      hr: 104,
      bpSys: 130,
      bpDia: 82,
      spo2: 94,
      rr: 22,
      temp: 38.0,
      source: "Manual Entry",
      notes: "Slight increase in work of breathing noted. Increased FiO2 by 5%.",
      staff: "Nurse J. Miller"
    },
    {
      id: "OBS-101-3",
      timestamp: "2026-10-02 21:00",
      timeLabel: "21:00",
      hr: 108,
      bpSys: 134,
      bpDia: 84,
      spo2: 93,
      rr: 24,
      temp: 38.2,
      source: "Mindray Device",
      notes: "ABG sampled. PaO2/FiO2 ratio 180.",
      staff: "Auto Device Stream"
    },
    {
      id: "OBS-101-4",
      timestamp: "2026-10-02 22:30",
      timeLabel: "22:30",
      hr: 112,
      bpSys: 138,
      bpDia: 86,
      spo2: 91,
      rr: 26,
      temp: 38.4,
      source: "Hamilton Ventilator / Mindray",
      notes: "SpO2 drop to 91%. Suctioning performed with moderate secretions.",
      staff: "Dr. S. Lin / Nurse J. Miller"
    }
  ],
  "PT-102": [
    {
      id: "OBS-102-1",
      timestamp: "2026-10-02 17:00",
      timeLabel: "17:00",
      hr: 105,
      bpSys: 96,
      bpDia: 60,
      spo2: 96,
      rr: 20,
      temp: 38.2,
      source: "Philips Device",
      notes: "IV fluid bolus 500ml Normal Saline started.",
      staff: "Auto Device Stream"
    },
    {
      id: "OBS-102-2",
      timestamp: "2026-10-02 19:00",
      timeLabel: "19:00",
      hr: 114,
      bpSys: 90,
      bpDia: 58,
      spo2: 95,
      rr: 22,
      temp: 38.8,
      source: "Manual Entry",
      notes: "Norepinephrine infusion initiated at 0.05 mcg/kg/min.",
      staff: "Dr. S. Lin"
    },
    {
      id: "OBS-102-3",
      timestamp: "2026-10-02 21:00",
      timeLabel: "21:00",
      hr: 124,
      bpSys: 84,
      bpDia: 52,
      spo2: 94,
      rr: 24,
      temp: 39.1,
      source: "Philips Device",
      notes: "Device telemetry disconnected. High fever recorded.",
      staff: "Auto Device Stream"
    }
  ],
  "PT-103": [
    {
      id: "OBS-103-1",
      timestamp: "2026-10-02 16:00",
      timeLabel: "16:00",
      hr: 76,
      bpSys: 126,
      bpDia: 80,
      spo2: 98,
      rr: 16,
      temp: 36.8,
      source: "GE Device",
      notes: "GCS 14 (E4 V4 M6). Pupils equal and reactive to light.",
      staff: "Auto Device Stream"
    },
    {
      id: "OBS-103-2",
      timestamp: "2026-10-02 20:00",
      timeLabel: "20:00",
      hr: 74,
      bpSys: 122,
      bpDia: 78,
      spo2: 99,
      rr: 16,
      temp: 36.9,
      source: "GE Device",
      notes: "Neurological exam stable. Surgical dressing dry and intact.",
      staff: "Nurse K. Patel"
    }
  ],
  "PT-104": [
    {
      id: "OBS-104-1",
      timestamp: "2026-10-02 18:00",
      timeLabel: "18:00",
      hr: 92,
      bpSys: 162,
      bpDia: 98,
      spo2: 92,
      rr: 24,
      temp: 37.1,
      source: "Mindray Device",
      notes: "BiPAP support initiated for pulmonary edema. Furosemide 40mg IV given.",
      staff: "Dr. S. Lin"
    },
    {
      id: "OBS-104-2",
      timestamp: "2026-10-02 21:30",
      timeLabel: "21:30",
      hr: 98,
      bpSys: 156,
      bpDia: 94,
      spo2: 94,
      rr: 21,
      temp: 37.2,
      source: "Mindray Device",
      notes: "Diuresis 450ml over 3 hours. Dyspnea improving.",
      staff: "Nurse J. Miller"
    }
  ],
  "PT-105": [
    {
      id: "OBS-105-1",
      timestamp: "2026-10-02 19:00",
      timeLabel: "19:00",
      hr: 92,
      bpSys: 122,
      bpDia: 76,
      spo2: 98,
      rr: 20,
      temp: 37.1,
      source: "Manual Entry",
      notes: "Blood glucose 210 mg/dL. Anion gap normalized to 11.",
      staff: "Nurse T. Mada"
    },
    {
      id: "OBS-105-2",
      timestamp: "2026-10-02 22:30",
      timeLabel: "22:30",
      hr: 86,
      bpSys: 118,
      bpDia: 74,
      spo2: 98,
      rr: 18,
      temp: 37.0,
      source: "Manual Entry",
      notes: "Transition to subcutaneous basal insulin planned for morning.",
      staff: "Nurse T. Mada"
    }
  ]
};

// Section 3: Medication Administration Records (MAR)
export const INITIAL_MEDICATIONS = {
  "PT-101": [
    {
      id: "MED-101-1",
      medicationName: "Fentanyl Citrate",
      prescribedDose: "50",
      administeredDose: "50",
      doseUnit: "mcg/hr",
      route: "IV Continuous Infusion",
      frequency: "Continuous",
      status: "Administered",
      time: "2026-10-02 22:00",
      notes: "Titrated for sedation and ventilator synchrony (CPOT score 2).",
      staff: "Nurse J. Miller, RN"
    },
    {
      id: "MED-101-2",
      medicationName: "Meropenem",
      prescribedDose: "1",
      administeredDose: "1",
      doseUnit: "g",
      route: "IV Infusion (over 3 hrs)",
      frequency: "Q8H",
      status: "Administered",
      time: "2026-10-02 20:00",
      notes: "Dose 4 of 14 for hospital-acquired pneumonia.",
      staff: "Nurse J. Miller, RN"
    },
    {
      id: "MED-101-3",
      medicationName: "Furosemide",
      prescribedDose: "20",
      administeredDose: "20",
      doseUnit: "mg",
      route: "IV Bolus",
      frequency: "PRN",
      status: "Administered",
      time: "2026-10-02 18:30",
      notes: "Administered for positive cumulative fluid balance.",
      staff: "Dr. S. Lin, MD"
    }
  ],
  "PT-102": [
    {
      id: "MED-102-1",
      medicationName: "Norepinephrine",
      prescribedDose: "0.10",
      administeredDose: "0.08",
      doseUnit: "mcg/kg/min",
      route: "IV Central Line Infusion",
      frequency: "Continuous",
      status: "Administered",
      time: "2026-10-02 21:30",
      notes: "Titrating to maintain MAP ≥ 65 mmHg in septic shock.",
      staff: "Dr. S. Lin, MD"
    },
    {
      id: "MED-102-2",
      medicationName: "Ceftriaxone",
      prescribedDose: "2",
      administeredDose: "2",
      doseUnit: "g",
      route: "IV Infusion",
      frequency: "Q24H",
      status: "Administered",
      time: "2026-10-02 18:00",
      notes: "Urine culture pending. Empiric therapy.",
      staff: "Nurse K. Patel, RN"
    }
  ],
  "PT-103": [
    {
      id: "MED-103-1",
      medicationName: "Levetiracetam (Keppra)",
      prescribedDose: "500",
      administeredDose: "500",
      doseUnit: "mg",
      route: "IV Infusion",
      frequency: "Q12H",
      status: "Administered",
      time: "2026-10-02 20:00",
      notes: "Post-op seizure prophylaxis. Well tolerated.",
      staff: "Nurse K. Patel, RN"
    },
    {
      id: "MED-103-2",
      medicationName: "Paracetamol",
      prescribedDose: "1",
      administeredDose: "1",
      doseUnit: "g",
      route: "IV Infusion",
      frequency: "Q6H PRN",
      status: "Administered",
      time: "2026-10-02 16:00",
      notes: "Post-craniotomy headache rated 4/10.",
      staff: "Nurse K. Patel, RN"
    }
  ],
  "PT-104": [
    {
      id: "MED-104-1",
      medicationName: "Nitroglycerin (NTG)",
      prescribedDose: "20",
      administeredDose: "15",
      doseUnit: "mcg/min",
      route: "IV Infusion",
      frequency: "Continuous",
      status: "Administered",
      time: "2026-10-02 21:00",
      notes: "Titrating for chest pain and afterload reduction.",
      staff: "Dr. S. Lin, MD"
    }
  ],
  "PT-105": [
    {
      id: "MED-105-1",
      medicationName: "Regular Insulin",
      prescribedDose: "4",
      administeredDose: "4",
      doseUnit: "units/hr",
      route: "IV Infusion",
      frequency: "Continuous",
      status: "Administered",
      time: "2026-10-02 22:00",
      notes: "Blood glucose hourly check 188 mg/dL. Anion gap closed.",
      staff: "Nurse T. Mada, RN"
    }
  ]
};

// Section 4 & 5: Fluid Intake & Output (I/O) & Urine Records
export const INITIAL_FLUID_RECORDS = {
  "PT-101": [
    {
      id: "FL-101-1",
      interval: "18:00 - 22:00 (4-hr interval)",
      oralIntake: 0,
      ivIntake: 450,
      otherIntake: 50,
      totalIntake: 500,
      urineOutput: 280,
      otherOutput: 60, // Chest tube drainage
      totalOutput: 340,
      netBalance: 160, // +160 mL
      urineAppearance: "Clear Amber",
      catheterStatus: "Foley Catheter (14 Fr)",
      time: "2026-10-02 22:00",
      notes: "Serosanguinous drainage in chest drain 60ml. Adequate urine hourly output (0.7 ml/kg/hr).",
      staff: "Nurse J. Miller, RN"
    }
  ],
  "PT-102": [
    {
      id: "FL-102-1",
      interval: "16:00 - 20:00 (4-hr interval)",
      oralIntake: 0,
      ivIntake: 1200, // Fluid resuscitation
      otherIntake: 0,
      totalIntake: 1200,
      urineOutput: 110, // Oliguria in septic shock
      otherOutput: 0,
      totalOutput: 110,
      netBalance: 1090, // +1090 mL
      urineAppearance: "Dark Amber / Concentrated",
      catheterStatus: "Foley Catheter with Urometer",
      time: "2026-10-02 20:00",
      notes: "Oliguric state (<0.4 ml/kg/hr). Nephrology consulted for persistent oliguria.",
      staff: "Dr. S. Lin, MD"
    }
  ],
  "PT-103": [
    {
      id: "FL-103-1",
      interval: "16:00 - 20:00 (4-hr interval)",
      oralIntake: 200,
      ivIntake: 300,
      otherIntake: 0,
      totalIntake: 500,
      urineOutput: 420,
      otherOutput: 20, // Subdural wound drain
      totalOutput: 440,
      netBalance: 60, // +60 mL
      urineAppearance: "Clear Straw",
      catheterStatus: "Foley Catheter",
      time: "2026-10-02 20:00",
      notes: "Euvolemic balance. Tolerating sips of water.",
      staff: "Nurse K. Patel, RN"
    }
  ],
  "PT-104": [
    {
      id: "FL-104-1",
      interval: "18:00 - 22:00 (4-hr interval)",
      oralIntake: 0,
      ivIntake: 150,
      otherIntake: 0,
      totalIntake: 150,
      urineOutput: 580,
      otherOutput: 0,
      totalOutput: 580,
      netBalance: -430, // Negative balance desired for pulmonary edema
      urineAppearance: "Clear Pale Amber",
      catheterStatus: "Foley Catheter",
      time: "2026-10-02 22:00",
      notes: "Good diuresis response to IV Furosemide. Negative fluid balance achieved as planned.",
      staff: "Nurse J. Miller, RN"
    }
  ],
  "PT-105": [
    {
      id: "FL-105-1",
      interval: "18:00 - 22:00 (4-hr interval)",
      oralIntake: 100,
      ivIntake: 800,
      otherIntake: 0,
      totalIntake: 900,
      urineOutput: 650,
      otherOutput: 0,
      totalOutput: 650,
      netBalance: 250,
      urineAppearance: "Clear",
      catheterStatus: "Voiding spontaneously with urinal",
      time: "2026-10-02 22:00",
      notes: "Osmotic diuresis slowing down as hyperglycemia resolves.",
      staff: "Nurse T. Mada, RN"
    }
  ]
};

// Section 6: Laboratory & ABG Results
export const INITIAL_LAB_RESULTS = {
  "PT-101": [
    {
      id: "LAB-101-1",
      panel: "Arterial Blood Gas (ABG)",
      collectionTime: "2026-10-02 21:00",
      resultTime: "2026-10-02 21:20",
      status: "Abnormal",
      values: {
        ph: { val: 7.32, unit: "", ref: "7.35 - 7.45", flag: "low" },
        pao2: { val: 74, unit: "mmHg", ref: "80 - 100", flag: "low" },
        paco2: { val: 48, unit: "mmHg", ref: "35 - 45", flag: "high" },
        hco3: { val: 24.2, unit: "mEq/L", ref: "22 - 26", flag: "normal" },
        lactate: { val: 1.8, unit: "mmol/L", ref: "< 2.0", flag: "normal" }
      },
      notes: "Mild respiratory acidosis. PaO2/FiO2 ratio 180 (Moderate ARDS criteria).",
      staff: "Lab Tech / Dr. S. Lin"
    },
    {
      id: "LAB-101-2",
      panel: "Hematology & Chemistry",
      collectionTime: "2026-10-02 18:00",
      resultTime: "2026-10-02 18:45",
      status: "Reviewed",
      values: {
        hb: { val: 10.4, unit: "g/dL", ref: "12.0 - 15.5", flag: "low" },
        wbc: { val: 14.8, unit: "×10³/µL", ref: "4.5 - 11.0", flag: "high" },
        platelets: { val: 210, unit: "×10³/µL", ref: "150 - 450", flag: "normal" },
        creatinine: { val: 1.1, unit: "mg/dL", ref: "0.6 - 1.2", flag: "normal" },
        potassium: { val: 4.1, unit: "mEq/L", ref: "3.5 - 5.0", flag: "normal" }
      },
      notes: "Leukocytosis consistent with post-op lung inflammation.",
      staff: "Central Lab"
    }
  ],
  "PT-102": [
    {
      id: "LAB-102-1",
      panel: "Renal & Sepsis Markers",
      collectionTime: "2026-10-02 18:30",
      resultTime: "2026-10-02 19:15",
      status: "Critical",
      values: {
        wbc: { val: 22.4, unit: "×10³/µL", ref: "4.5 - 11.0", flag: "critical" },
        creatinine: { val: 2.8, unit: "mg/dL", ref: "0.7 - 1.3", flag: "critical" },
        urea: { val: 78, unit: "mg/dL", ref: "10 - 40", flag: "high" },
        lactate: { val: 4.2, unit: "mmol/L", ref: "< 2.0", flag: "critical" },
        potassium: { val: 5.3, unit: "mEq/L", ref: "3.5 - 5.0", flag: "high" }
      },
      notes: "Severe lactic acidosis and acute kidney injury (KDIGO Stage 2).",
      staff: "Stat Lab / Dr. S. Lin"
    }
  ],
  "PT-103": [
    {
      id: "LAB-103-1",
      panel: "Routine Electrolytes & Coagulation",
      collectionTime: "2026-10-02 16:00",
      resultTime: "2026-10-02 16:45",
      status: "Normal",
      values: {
        hb: { val: 12.1, unit: "g/dL", ref: "12.0 - 15.5", flag: "normal" },
        sodium: { val: 139, unit: "mEq/L", ref: "135 - 145", flag: "normal" },
        potassium: { val: 4.0, unit: "mEq/L", ref: "3.5 - 5.0", flag: "normal" },
        inr: { val: 1.05, unit: "", ref: "0.9 - 1.1", flag: "normal" }
      },
      notes: "Post-op labs within baseline limits.",
      staff: "Central Lab"
    }
  ],
  "PT-104": [
    {
      id: "LAB-104-1",
      panel: "Cardiac Biomarkers & Chemistry",
      collectionTime: "2026-10-02 17:30",
      resultTime: "2026-10-02 18:15",
      status: "Abnormal",
      values: {
        troponinT: { val: 480, unit: "ng/L", ref: "< 14", flag: "critical" },
        bnp: { val: 1450, unit: "pg/mL", ref: "< 100", flag: "critical" },
        creatinine: { val: 1.4, unit: "mg/dL", ref: "0.7 - 1.3", flag: "high" }
      },
      notes: "Elevated troponin and BNP confirming NSTEMI with heart failure decompensation.",
      staff: "Stat Lab"
    }
  ],
  "PT-105": [
    {
      id: "LAB-105-1",
      panel: "DKA Metabolic Panel",
      collectionTime: "2026-10-02 21:00",
      resultTime: "2026-10-02 21:30",
      status: "Improving",
      values: {
        glucose: { val: 188, unit: "mg/dL", ref: "70 - 140", flag: "high" },
        ph: { val: 7.36, unit: "", ref: "7.35 - 7.45", flag: "normal" },
        hco3: { val: 21.0, unit: "mEq/L", ref: "22 - 26", flag: "normal" },
        potassium: { val: 4.2, unit: "mEq/L", ref: "3.5 - 5.0", flag: "normal" },
        anionGap: { val: 10.5, unit: "mEq/L", ref: "8 - 12", flag: "normal" }
      },
      notes: "Anion gap resolved. Ketoacidosis successfully corrected.",
      staff: "ICU POC Lab"
    }
  ]
};

// Section 2: Clinical & Nursing Notes
export const INITIAL_CLINICAL_NOTES = {
  "PT-101": [
    {
      id: "NOTE-101-1",
      time: "2026-10-02 22:30",
      author: "Dr. Sarah Lin, MD (ICU Resident)",
      type: "Doctor's Assessment & Plan",
      findings: "Patient tachypneic on PRVC mode (RR 26 bpm), SpO2 91% on FiO2 55%. Bilateral diffuse crackles heard on auscultation. Chest X-ray showed bilateral infiltrates.",
      plan: "1. Continue protective lung ventilation (6 ml/kg PBW). 2. Increase PEEP to 12 cmH2O. 3. Target negative fluid balance with Furosemide. 4. Maintain sedation CPOT 2.",
      gcsScore: "Sedated (RASS -2)",
      pupils: "3mm Equal and Reactive"
    },
    {
      id: "NOTE-101-2",
      time: "2026-10-02 19:30",
      author: "Nurse J. Miller, RN",
      type: "Nursing Observation",
      findings: "Suctioning performed via endotracheal tube with moderate thick white secretions. Repositioned to semi-fowlers 30 degrees. Oral care given with chlorhexidine.",
      plan: "Hourly vitals monitoring and monitor peak airway pressures.",
      gcsScore: "Sedated (RASS -2)",
      pupils: "3mm Equal and Reactive"
    }
  ],
  "PT-102": [
    {
      id: "NOTE-102-1",
      time: "2026-10-02 21:00",
      author: "Dr. Sarah Lin, MD (ICU Resident)",
      type: "Doctor's Sepsis Note",
      findings: "Septic shock with refractory hypotension (BP 84/52). Cold peripheries with capillary refill > 3 seconds. Urine output 25 ml/hr. High fever 39.1°C.",
      plan: "1. Increase Norepinephrine to target MAP > 65 mmHg. 2. Start Vasopressin 0.03 units/min if NE exceeds 0.25. 3. Repeat lactate in 2 hours. 4. Blood and urine cultures sent.",
      gcsScore: "GCS 11 (E3 V3 M5 - Lethargic)",
      pupils: "3mm Equal and Reactive"
    }
  ],
  "PT-103": [
    {
      id: "NOTE-103-1",
      time: "2026-10-02 20:00",
      author: "Nurse K. Patel, RN",
      type: "Neuro Observation & Nursing Note",
      findings: "GCS 14/15. Patient oriented to person and place. No focal neurological deficit. Left craniotomy dressing clean, dry, and intact with 20ml serosanguinous drain.",
      plan: "Hourly neurological assessment. Maintain head of bed elevated 30 degrees.",
      gcsScore: "GCS 14 (E4 V4 M6)",
      pupils: "3.5mm Equal and Briskly Reactive"
    }
  ],
  "PT-104": [
    {
      id: "NOTE-104-1",
      time: "2026-10-02 21:30",
      author: "Dr. Sarah Lin, MD",
      type: "Cardiology / ICU Progress Note",
      findings: "Hypertension 156/94 mmHg with dyspnea improving on BiPAP. Clear lung bases with decreased crepitations.",
      plan: "1. Continue NTG infusion and titrate SBP < 140. 2. Troponin curve monitoring. 3. Echocardiogram scheduled for tomorrow morning.",
      gcsScore: "GCS 15 (Alert and Oriented)",
      pupils: "3mm Equal"
    }
  ],
  "PT-105": [
    {
      id: "NOTE-105-1",
      time: "2026-10-02 22:30",
      author: "Nurse T. Mada, RN",
      type: "DKA Protocol Nursing Note",
      findings: "Patient alert, sitting up in bed, requesting oral fluids. Blood glucose stable on insulin infusion at 4 units/hr.",
      plan: "Continue DKA hourly POC glucose checks. Transition to subcutaneous glargine planned with endocrinology.",
      gcsScore: "GCS 15 (Alert and Oriented)",
      pupils: "3mm Equal"
    }
  ]
};

export const INITIAL_ALERTS = [
  {
    id: "ALT-101",
    patientId: "PT-101",
    patientName: "Eleanor Vance",
    bedNumber: "ICU-04",
    severity: "high", // "high" | "medium" | "low"
    parameter: "SpO₂ & Respiratory Rate",
    description: "SpO₂ dropped to 91% with elevated RR (26 bpm) [Configured Demo Rule: Hypoxemic threshold]",
    timestamp: "12 mins ago",
    status: "Active",
    isAcknowledged: false
  },
  {
    id: "ALT-102",
    patientId: "PT-102",
    patientName: "Marcus Wright",
    bedNumber: "ICU-02",
    severity: "high",
    parameter: "Blood Pressure & Heart Rate",
    description: "Hypotension (SBP 84 mmHg) with severe Tachycardia (124 bpm) [Configured Demo Rule: Septic Shock Marker]",
    timestamp: "35 mins ago",
    status: "Active",
    isAcknowledged: false
  },
  {
    id: "ALT-103",
    patientId: "PT-102",
    patientName: "Marcus Wright",
    bedNumber: "ICU-02",
    severity: "medium",
    parameter: "Device Telemetry",
    description: "Bedside Monitor Philips MX800 reporting disconnected / stale telemetry (>30m) [Configured Demo Rule]",
    timestamp: "30 mins ago",
    status: "Active",
    isAcknowledged: false
  },
  {
    id: "ALT-104",
    patientId: "PT-104",
    patientName: "David Alvarez",
    bedNumber: "ICU-07",
    severity: "medium",
    parameter: "Blood Pressure",
    description: "Hypertension Stage 2 (BP 156/94 mmHg) [Configured Demo Rule: SBP > 150]",
    timestamp: "45 mins ago",
    status: "Acknowledged",
    isAcknowledged: true
  }
];

export const INITIAL_DEVICES = [
  {
    id: "DEV-01",
    name: "Mindray BeneVision N17",
    bed: "ICU-04",
    patientId: "PT-101",
    type: "Multiparameter Patient Monitor",
    status: "Connected", // "Connected" | "Disconnected" | "Demo" | "Unknown"
    lastSync: "2 mins ago",
    dataFreshness: "Fresh (< 5m)",
    details: "ECG, NIBP, SpO2, Temp 2-Ch"
  },
  {
    id: "DEV-02",
    name: "Hamilton G5 Ventilator",
    bed: "ICU-04",
    patientId: "PT-101",
    type: "Mechanical Ventilator",
    status: "Connected",
    lastSync: "2 mins ago",
    dataFreshness: "Fresh (< 5m)",
    details: "PRVC Mode, Flow Sensor Active"
  },
  {
    id: "DEV-03",
    name: "Philips IntelliVue MX800",
    bed: "ICU-02",
    patientId: "PT-102",
    type: "Multiparameter Patient Monitor",
    status: "Disconnected",
    lastSync: "35 mins ago",
    dataFreshness: "Stale (> 30m)",
    details: "Network interface unpingable, battery telemetry offline"
  },
  {
    id: "DEV-04",
    name: "GE Healthcare Carescape B650",
    bed: "ICU-01",
    patientId: "PT-103",
    type: "Multiparameter Patient Monitor",
    status: "Connected",
    lastSync: "5 mins ago",
    dataFreshness: "Fresh (< 10m)",
    details: "Continuous Hemodynamic Stream"
  },
  {
    id: "DEV-05",
    name: "Mindray BeneVision N17 (Simulated)",
    bed: "ICU-07",
    patientId: "PT-104",
    type: "Multiparameter Patient Monitor",
    status: "Demo",
    lastSync: "12 mins ago",
    dataFreshness: "Synthetic Demo Stream",
    details: "Looping demonstration data profile"
  },
  {
    id: "DEV-06",
    name: "Braun Space Infusion Telemetry",
    bed: "ICU-05",
    patientId: "PT-105",
    type: "Telemetry Bridge",
    status: "Unknown",
    lastSync: "Never",
    dataFreshness: "No Device Connected (Manual Charting)",
    details: "Unconfigured port / Manual ICU bed"
  }
];
