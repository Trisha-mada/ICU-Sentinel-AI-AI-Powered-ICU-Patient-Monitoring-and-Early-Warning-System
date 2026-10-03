import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserPlus, 
  X, 
  Bed, 
  User, 
  FileText, 
  Calendar, 
  Clock, 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  Wind,
  ShieldAlert,
  Hash,
  Loader2,
  Lock,
  Sparkles
} from 'lucide-react';
import { usePatientData, FIXED_ICU_BEDS } from '../context/PatientDataContext';
import apiService from '../services/api';

export const AddPatientModal = ({ isOpen, onClose, initialBed = null }) => {
  const { createNewPatient, all12Beds, stats, refreshData } = usePatientData();

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    mrn: '',
    fullName: '',
    age: '',
    gender: 'Male',
    bedNumber: 'ICU-01',
    diagnosis: '',
    admissionDate: '',
    admissionTime: '',
    status: 'Stable',
    ventilatorAttached: false
  });

  const [isLoadingNextId, setIsLoadingNextId] = useState(false);
  const [occupiedBedsMap, setOccupiedBedsMap] = useState(new Map());
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track previous open state to only trigger initialization on open transition
  const prevIsOpenRef = useRef(false);

  // Current local date string helper
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getCurrentTimeStr = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const todayDateStr = useMemo(() => getTodayDateStr(), []);

  // When modal opens (transition false -> true), fetch sequential next ID and latest bed statuses
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    prevIsOpenRef.current = isOpen;

    if (isOpening) {
      setServerError(null);
      setErrors({});
      setIsLoadingNextId(true);

      const defaultDate = getTodayDateStr();
      const defaultTime = getCurrentTimeStr();

      // Parallel fetch for authoritative predicted next ID and fresh bed occupancy
      Promise.allSettled([
        apiService.getNextPatientId(),
        apiService.getBedStatuses()
      ]).then(([idRes, bedsRes]) => {
        const nextId = (idRes.status === 'fulfilled' && idRes.value?.nextPatientId)
          ? idRes.value.nextPatientId
          : '001';

        const freshOccMap = new Map();
        if (bedsRes.status === 'fulfilled' && bedsRes.value?.success && Array.isArray(bedsRes.value.data)) {
          bedsRes.value.data.forEach(b => {
            if (b.isOccupied) {
              freshOccMap.set(b.bedNumber, b.patientName || `Patient ${b.patientId}`);
            }
          });
        } else {
          all12Beds.forEach(b => {
            if (b.isOccupied) {
              freshOccMap.set(b.bedNumber, b.patientName || `Patient ${b.patientId}`);
            }
          });
        }

        setOccupiedBedsMap(freshOccMap);

        let targetBed = initialBed && !freshOccMap.has(initialBed) ? initialBed : null;
        if (!targetBed) {
          targetBed = FIXED_ICU_BEDS.find(b => !freshOccMap.has(b)) || FIXED_ICU_BEDS[0];
        }

        setFormData({
          id: nextId,
          mrn: '',
          fullName: '',
          age: '',
          gender: 'Male',
          bedNumber: targetBed,
          diagnosis: '',
          admissionDate: defaultDate,
          admissionTime: defaultTime,
          status: 'Stable',
          ventilatorAttached: false
        });
      }).catch(() => {
        setFormData({
          id: '001',
          mrn: '',
          fullName: '',
          age: '',
          gender: 'Male',
          bedNumber: initialBed || FIXED_ICU_BEDS[0],
          diagnosis: '',
          admissionDate: defaultDate,
          admissionTime: defaultTime,
          status: 'Stable',
          ventilatorAttached: false
        });
      }).finally(() => {
        setIsLoadingNextId(false);
      });
    }
  }, [isOpen, initialBed]);

  if (!isOpen) return null;

  const totalOccupiedCount = occupiedBedsMap.size;
  const isAllBedsOccupied = totalOccupiedCount >= 12;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (serverError) setServerError(null);
  };

  const validate = () => {
    const newErrors = {};

    if (isAllBedsOccupied) {
      newErrors.bedNumber = 'All 12 ICU beds are currently occupied. Cannot admit new patients.';
    }

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name is required (minimum 2 characters).';
    }

    const ageNum = parseInt(formData.age, 10);
    if (formData.age === '' || isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      newErrors.age = 'Enter a valid age between 0 and 130.';
    }

    if (!formData.bedNumber.trim()) {
      newErrors.bedNumber = 'ICU Bed Number is required.';
    } else if (!FIXED_ICU_BEDS.includes(formData.bedNumber)) {
      newErrors.bedNumber = 'Selected bed must be one of the 12 fixed ICU beds (ICU-01 to ICU-12).';
    } else if (occupiedBedsMap.has(formData.bedNumber)) {
      newErrors.bedNumber = `Bed ${formData.bedNumber} is currently occupied by ${occupiedBedsMap.get(formData.bedNumber)}.`;
    }

    if (!formData.diagnosis.trim()) {
      newErrors.diagnosis = 'Admitting diagnosis is required.';
    }

    // Validate Admission Date and Time
    if (!formData.admissionDate) {
      newErrors.admissionDate = 'Admission date is required.';
    } else {
      const enteredDate = formData.admissionDate;
      const enteredTime = formData.admissionTime || '00:00';
      const enteredTimestamp = new Date(`${enteredDate}T${enteredTime}`);
      const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000); // 2 mins buffer for clock drift

      if (isNaN(enteredTimestamp.getTime())) {
        newErrors.admissionDate = 'Invalid date or time format.';
      } else if (enteredTimestamp > nowWithBuffer) {
        newErrors.admissionDate = 'Admission date and time cannot be in the future.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        patient_id: formData.id ? formData.id.trim() : undefined,
        id: formData.id ? formData.id.trim() : undefined,
        bed_id: formData.bedNumber.trim(),
        bed_number: formData.bedNumber.trim(),
        mrn: formData.mrn.trim() || null,
        full_name: formData.fullName.trim(),
        age: parseInt(formData.age, 10),
        gender: formData.gender,
        diagnosis: formData.diagnosis.trim(),
        admission_date: formData.admissionDate,
        admission_time: formData.admissionTime,
        status: formData.status,
        ventilator_attached: formData.ventilatorAttached
      };

      const result = await createNewPatient(payload);
      if (result.success) {
        onClose();
      } else {
        setServerError(result.error || 'Failed to register patient in Neon database.');
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content add-patient-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header flex-between">
          <div className="modal-header-title-group">
            <div className="modal-icon-badge">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="modal-title">Register ICU Patient & Admission</h3>
              <p className="modal-subtitle">Auto-generate sequential Patient ID, allocate a fixed ICU bed, and validate admission timestamp</p>
            </div>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* 12 Beds Full Alert Banner */}
        {isAllBedsOccupied && (
          <div className="modal-alert-box alert-warning flex-between">
            <div className="alert-content-group">
              <ShieldAlert size={18} className="alert-icon text-amber" />
              <span><strong>All 12 ICU beds are currently occupied.</strong> Please discharge an existing patient before admitting a new one.</span>
            </div>
          </div>
        )}

        {/* Server Error Alert */}
        {serverError && (
          <div className="modal-alert-box alert-error flex-between">
            <div className="alert-content-group">
              <AlertCircle size={18} className="alert-icon text-rose" />
              <span>{serverError}</span>
            </div>
            <button type="button" onClick={() => setServerError(null)} className="alert-dismiss-btn">
              <X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-patient-form">
          <div className="form-sections-grid">
            
            {/* Section 1: Demographics & Auto-Generated ID */}
            <div className="form-sub-card">
              <h4 className="sub-card-title flex-align-center gap-xs">
                <User size={15} className="text-blue" />
                <span>Patient Identification & Demographics</span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label flex-between" htmlFor="patient-id">
                    <span>Patient ID <span className="text-rose">*</span></span>
                    <span className="auto-gen-badge flex-align-center gap-xxs">
                      <Sparkles size={11} className="text-blue" />
                      Auto-Generated
                    </span>
                  </label>
                  <div className="input-with-icon">
                    <Lock size={14} className="input-icon text-muted" />
                    <input 
                      id="patient-id"
                      type="text"
                      className="form-input font-mono readonly-input"
                      value={formData.id}
                      readOnly
                      title="Patient ID is automatically assigned sequentially (001, 002, 003...) by the database sequence."
                    />
                    {isLoadingNextId && (
                      <Loader2 size={14} className="input-spinner animate-spin text-blue" />
                    )}
                  </div>
                  <span className="field-helper-text">
                    Database sequence ID ({formData.id || '...'}); never re-used even after discharge.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="patient-mrn">
                    Medical Record # (MRN) <span className="label-sub">(Optional)</span>
                  </label>
                  <input 
                    id="patient-mrn"
                    type="text"
                    className="form-input font-mono"
                    placeholder="e.g. MRN-84920"
                    value={formData.mrn}
                    onChange={e => handleChange('mrn', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  />
                  <span className="field-helper-text">Unique hospital identifier</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="patient-name">
                  Full Name <span className="text-rose">*</span>
                </label>
                <input 
                  id="patient-name"
                  type="text"
                  className={`form-input ${errors.fullName ? 'input-error' : ''}`}
                  placeholder="e.g. Eleanor Vance"
                  value={formData.fullName}
                  onChange={e => handleChange('fullName', e.target.value)}
                  disabled={isSubmitting || isAllBedsOccupied}
                />
                {errors.fullName && <span className="field-error-text">{errors.fullName}</span>}
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="patient-age">
                    Age <span className="text-rose">*</span>
                  </label>
                  <input 
                    id="patient-age"
                    type="number"
                    min="0"
                    max="130"
                    className={`form-input ${errors.age ? 'input-error' : ''}`}
                    placeholder="Years (0-130)"
                    value={formData.age}
                    onChange={e => handleChange('age', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  />
                  {errors.age && <span className="field-error-text">{errors.age}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="patient-gender">
                    Gender
                  </label>
                  <select 
                    id="patient-gender"
                    className="form-select"
                    value={formData.gender}
                    onChange={e => handleChange('gender', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Unspecified">Unspecified</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 2: 12-Bed Allocation & Admission Validation */}
            <div className="form-sub-card">
              <h4 className="sub-card-title flex-between">
                <span className="flex-align-center gap-xs">
                  <Bed size={15} className="text-teal" />
                  <span>ICU Bed Allocation (12 Fixed Beds)</span>
                </span>
                <span className="bed-occupancy-pill">
                  {12 - totalOccupiedCount} of 12 Available
                </span>
              </h4>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="patient-bed">
                    Assigned ICU Bed <span className="text-rose">*</span>
                  </label>
                  <select 
                    id="patient-bed"
                    className={`form-select font-mono ${errors.bedNumber ? 'input-error' : ''}`}
                    value={formData.bedNumber}
                    onChange={e => handleChange('bedNumber', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  >
                    {FIXED_ICU_BEDS.map(bed => {
                      const isOccupied = occupiedBedsMap.has(bed);
                      const occupant = occupiedBedsMap.get(bed);
                      return (
                        <option key={bed} value={bed} disabled={isOccupied}>
                          {bed} {isOccupied ? `(Occupied — ${occupant})` : '● Available'}
                        </option>
                      );
                    })}
                  </select>
                  {errors.bedNumber && <span className="field-error-text">{errors.bedNumber}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="admission-status">
                    Initial Acuity Status
                  </label>
                  <select 
                    id="admission-status"
                    className="form-select"
                    value={formData.status}
                    onChange={e => handleChange('status', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  >
                    <option value="Stable">Stable</option>
                    <option value="Alert">Alert (High Watch)</option>
                    <option value="Critical">Critical (Immediate Care)</option>
                    <option value="Observation">Observation</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="patient-diagnosis">
                  Primary Admitting Diagnosis <span className="text-rose">*</span>
                </label>
                <textarea 
                  id="patient-diagnosis"
                  rows="2"
                  className={`form-textarea ${errors.diagnosis ? 'input-error' : ''}`}
                  placeholder="e.g. Acute Respiratory Distress Syndrome (ARDS) secondary to Sepsis"
                  value={formData.diagnosis}
                  onChange={e => handleChange('diagnosis', e.target.value)}
                  disabled={isSubmitting || isAllBedsOccupied}
                ></textarea>
                {errors.diagnosis && <span className="field-error-text">{errors.diagnosis}</span>}
              </div>

              {/* Admission Date & Time Fields with Validation */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label flex-align-center gap-xs" htmlFor="admission-date">
                    <Calendar size={13} className="text-muted" />
                    <span>Admission Date <span className="text-rose">*</span></span>
                  </label>
                  <input 
                    id="admission-date"
                    type="date"
                    max={todayDateStr}
                    className={`form-input ${errors.admissionDate ? 'input-error' : ''}`}
                    value={formData.admissionDate}
                    onChange={e => handleChange('admissionDate', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  />
                  {errors.admissionDate && <span className="field-error-text">{errors.admissionDate}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label flex-align-center gap-xs" htmlFor="admission-time">
                    <Clock size={13} className="text-muted" />
                    <span>Admission Time <span className="text-rose">*</span></span>
                  </label>
                  <input 
                    id="admission-time"
                    type="time"
                    className="form-input"
                    value={formData.admissionTime}
                    onChange={e => handleChange('admissionTime', e.target.value)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  />
                  <span className="field-helper-text">Current local time (defaults to registration time)</span>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.25rem' }}>
                <label className="ventilator-toggle-label">
                  <input 
                    type="checkbox"
                    checked={formData.ventilatorAttached}
                    onChange={e => handleChange('ventilatorAttached', e.target.checked)}
                    disabled={isSubmitting || isAllBedsOccupied}
                  />
                  <span className="toggle-text flex-align-center gap-xs">
                    <Wind size={14} className={formData.ventilatorAttached ? 'text-teal' : 'text-muted'} />
                    <span>Mechanical Ventilator Connected to Bed</span>
                  </span>
                </label>
              </div>
            </div>

          </div>

          {/* Modal Actions */}
          <div className="modal-footer-actions flex-between">
            <span className="modal-tip-text">
              * Bed assignments and sequential IDs are verified concurrency-safely in Neon PostgreSQL.
            </span>

            <div className="flex-align-center gap-sm">
              <button 
                type="button" 
                className="btn btn-outline" 
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting || isAllBedsOccupied}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Admitting to Neon DB...</span>
                  </>
                ) : isAllBedsOccupied ? (
                  <>
                    <ShieldAlert size={16} />
                    <span>All 12 Beds Occupied</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Register & Admit Patient ({formData.bedNumber})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
