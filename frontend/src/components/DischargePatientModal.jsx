import React, { useState, useEffect, useMemo } from 'react';
import { 
  LogOut, 
  X, 
  AlertTriangle, 
  Bed, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileText,
  ShieldCheck,
  Building
} from 'lucide-react';
import { usePatientData } from '../context/PatientDataContext';

export const DischargePatientModal = ({ isOpen, onClose, patient }) => {
  const { dischargePatient } = usePatientData();

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const currentTimeStr = useMemo(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }, []);

  const [formData, setFormData] = useState({
    dischargeDate: '',
    dischargeTime: '',
    disposition: 'Transferred to Step-Down Ward',
    dischargeNotes: ''
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setServerError(null);
      setErrors({});
      setFormData({
        dischargeDate: todayDateStr,
        dischargeTime: currentTimeStr,
        disposition: 'Transferred to Step-Down Ward',
        dischargeNotes: ''
      });
    }
  }, [isOpen, todayDateStr, currentTimeStr]);

  if (!isOpen || !patient) return null;

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
    if (serverError) setServerError(null);
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.dischargeDate) {
      newErrors.dischargeDate = 'Discharge date is required.';
    } else {
      const enteredDate = formData.dischargeDate;
      const enteredTime = formData.dischargeTime || '00:00';
      const dischargeTimestamp = new Date(`${enteredDate}T${enteredTime}`);
      const nowWithBuffer = new Date(Date.now() + 2 * 60 * 1000);

      if (isNaN(dischargeTimestamp.getTime())) {
        newErrors.dischargeDate = 'Invalid discharge date or time format.';
      } else if (dischargeTimestamp > nowWithBuffer) {
        newErrors.dischargeDate = 'Discharge date and time cannot be in the future.';
      } else if (patient.admissionDate) {
        const admissionTime = new Date(patient.admissionTime || patient.admissionDate);
        if (dischargeTimestamp < admissionTime) {
          newErrors.dischargeDate = 'Discharge time cannot be earlier than patient admission time.';
        }
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
        discharge_date: formData.dischargeDate,
        discharge_time: formData.dischargeTime,
        disposition: formData.disposition,
        discharge_notes: formData.dischargeNotes.trim()
      };

      const patientIdentifier = patient.patient_id || patient.id;
      const result = await dischargePatient(patientIdentifier, payload);
      if (result.success) {
        onClose();
      } else {
        setServerError(result.error || 'Failed to discharge patient.');
      }
    } catch (err) {
      setServerError(err.message || 'An unexpected error occurred during discharge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-content discharge-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header flex-between">
          <div className="modal-header-title-group">
            <div className="modal-icon-badge badge-warning">
              <LogOut size={20} className="text-amber" />
            </div>
            <div>
              <h3 className="modal-title">Discharge Patient & Release ICU Bed</h3>
              <p className="modal-subtitle">
                End active ICU admission for <strong>{patient.name}</strong> ({patient.bedNumber})
              </p>
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

        <form onSubmit={handleSubmit} className="discharge-form">
          {/* Patient Overview Box */}
          <div className="patient-discharge-summary-card">
            <div className="summary-row flex-between">
              <div className="patient-demog-left">
                <h4 className="patient-name-bold">{patient.name}</h4>
                <span className="patient-meta-text">ID: <strong className="font-mono">{patient.id}</strong> • {patient.age} yrs • {patient.gender}</span>
              </div>
              <div className="patient-bed-badge">
                <Bed size={15} />
                <span>{patient.bedNumber}</span>
              </div>
            </div>
            <div className="summary-diag-row">
              <span><strong>Diagnosis:</strong> {patient.diagnosis}</span>
              <span><strong>Admitted:</strong> {patient.admissionDate}</span>
            </div>
          </div>

          <div className="discharge-form-fields">
            {/* Disposition & Destination */}
            <div className="form-group">
              <label className="form-label flex-align-center gap-xs" htmlFor="discharge-disposition">
                <Building size={14} className="text-blue" />
                <span>Discharge Destination / Disposition <span className="text-rose">*</span></span>
              </label>
              <select
                id="discharge-disposition"
                className="form-select"
                value={formData.disposition}
                onChange={e => handleChange('disposition', e.target.value)}
                disabled={isSubmitting}
              >
                <option value="Transferred to Step-Down Ward">Transferred to Step-Down Ward</option>
                <option value="Transferred to General Medical Ward">Transferred to General Medical Ward</option>
                <option value="Transferred to Surgical Ward">Transferred to Surgical Ward</option>
                <option value="Discharged Home (Recovered)">Discharged Home (Recovered)</option>
                <option value="Transferred to Higher Speciality Center">Transferred to Higher Speciality Center</option>
                <option value="Transferred to Long-Term Acute Care (LTACH)">Transferred to Long-Term Acute Care (LTACH)</option>
                <option value="Palliative / Hospice Care">Palliative / Hospice Care</option>
              </select>
            </div>

            {/* Discharge Date and Time */}
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label flex-align-center gap-xs" htmlFor="discharge-date">
                  <Calendar size={13} className="text-muted" />
                  <span>Discharge Date <span className="text-rose">*</span></span>
                </label>
                <input 
                  id="discharge-date"
                  type="date"
                  max={todayDateStr}
                  className={`form-input ${errors.dischargeDate ? 'input-error' : ''}`}
                  value={formData.dischargeDate}
                  onChange={e => handleChange('dischargeDate', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.dischargeDate && <span className="field-error-text">{errors.dischargeDate}</span>}
              </div>

              <div className="form-group">
                <label className="form-label flex-align-center gap-xs" htmlFor="discharge-time">
                  <Clock size={13} className="text-muted" />
                  <span>Discharge Time <span className="text-rose">*</span></span>
                </label>
                <input 
                  id="discharge-time"
                  type="time"
                  className="form-input"
                  value={formData.dischargeTime}
                  onChange={e => handleChange('dischargeTime', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Discharge Clinical Notes */}
            <div className="form-group">
              <label className="form-label flex-align-center gap-xs" htmlFor="discharge-notes">
                <FileText size={14} className="text-teal" />
                <span>Discharge Summary & Clinical Handover Notes</span>
              </label>
              <textarea 
                id="discharge-notes"
                rows="3"
                className="form-textarea"
                placeholder="e.g. Hemodynamically stable, extubated, weaned off inotropes. Handover given to Step-Down nursing team."
                value={formData.dischargeNotes}
                onChange={e => handleChange('dischargeNotes', e.target.value)}
                disabled={isSubmitting}
              ></textarea>
            </div>

            {/* Non-Destructive Assurance Notice */}
            <div className="non-destructive-notice flex-align-center gap-sm">
              <ShieldCheck size={20} className="text-emerald" />
              <div>
                <p className="notice-title">Clinical History Preservation</p>
                <p className="notice-text">
                  This action releases bed <strong>{patient.bedNumber}</strong> immediately while preserving all vital observations, clinical notes, medications, fluid records, and lab results permanently in Neon PostgreSQL.
                </p>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="modal-footer-actions flex-between">
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
              className="btn btn-warning-action"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Processing Discharge...</span>
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  <span>Confirm Discharge & Release Bed ({patient.bedNumber})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DischargePatientModal;
