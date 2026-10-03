/**
 * ICU Sentinel — Dedicated Frontend API Service Module
 * Connects the React application with the Node.js Express backend and Neon PostgreSQL
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Generic fetch wrapper with error handling and JSON parsing
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.message || `HTTP ${response.status} ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (err.status) throw err;
    
    const networkError = new Error(
      `Unable to reach ICU Sentinel backend at ${API_BASE_URL}. Ensure the backend server is running on port 5000.`
    );
    networkError.isNetworkError = true;
    networkError.originalError = err;
    throw networkError;
  }
}

export const apiService = {
  // System Health
  async getHealth() {
    return request('/health');
  },

  // Patients & Next ID
  async getNextPatientId() {
    return request('/patients/next-id');
  },

  async getPatients(includeDischarged = false) {
    return request(`/patients${includeDischarged ? '?includeDischarged=true' : ''}`);
  },

  async getPatientHistory() {
    return request('/patients/history');
  },

  async getPatient(id) {
    return request(`/patients/${encodeURIComponent(id)}`);
  },

  async createPatient(patientData) {
    return request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData)
    });
  },

  async dischargePatient(patientId, dischargeData) {
    return request(`/patients/${encodeURIComponent(patientId)}/discharge`, {
      method: 'POST',
      body: JSON.stringify(dischargeData)
    });
  },

  async getPatientAdmissions(patientId) {
    return request(`/patients/${encodeURIComponent(patientId)}/admissions`);
  },

  async createPatientAdmission(patientId, admissionData) {
    return request(`/patients/${encodeURIComponent(patientId)}/admissions`, {
      method: 'POST',
      body: JSON.stringify(admissionData)
    });
  },

  // 12-Bed Occupancy Status
  async getBedStatuses() {
    return request('/patients/beds/status');
  },

  // Vital Signs & Telemetry Observations
  async getPatientVitals(patientId, limit = 50) {
    return request(`/patients/${encodeURIComponent(patientId)}/vitals?limit=${limit}`);
  },

  async recordVitals(patientId, vitalsData) {
    return request(`/patients/${encodeURIComponent(patientId)}/vitals`, {
      method: 'POST',
      body: JSON.stringify(vitalsData)
    });
  },

  // Clinical & Nursing Notes
  async getClinicalNotes(patientId) {
    return request(`/patients/${encodeURIComponent(patientId)}/notes`);
  },

  async createClinicalNote(patientId, noteData) {
    return request(`/patients/${encodeURIComponent(patientId)}/notes`, {
      method: 'POST',
      body: JSON.stringify(noteData)
    });
  },

  // Medication Administration Records (MAR)
  async getMedicationRecords(patientId) {
    return request(`/patients/${encodeURIComponent(patientId)}/medications`);
  },

  async createMedicationRecord(patientId, medData) {
    return request(`/patients/${encodeURIComponent(patientId)}/medications`, {
      method: 'POST',
      body: JSON.stringify(medData)
    });
  },

  // Fluid Intake & Output
  async getFluidRecords(patientId) {
    return request(`/patients/${encodeURIComponent(patientId)}/fluids`);
  },

  async createFluidRecord(patientId, fluidData) {
    return request(`/patients/${encodeURIComponent(patientId)}/fluids`, {
      method: 'POST',
      body: JSON.stringify(fluidData)
    });
  },

  // Laboratory & Blood Gas Results
  async getLabResults(patientId) {
    return request(`/patients/${encodeURIComponent(patientId)}/labs`);
  },

  async createLabResult(patientId, labData) {
    return request(`/patients/${encodeURIComponent(patientId)}/labs`, {
      method: 'POST',
      body: JSON.stringify(labData)
    });
  }
};

export default apiService;
