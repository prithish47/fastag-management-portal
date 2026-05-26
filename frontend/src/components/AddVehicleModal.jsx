import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { X, Upload, CheckCircle, AlertCircle, Car, Loader2, CloudUpload } from 'lucide-react';

const VEHICLE_CLASSES = ['VC4', 'VC5', 'VC7', 'VC12', 'VC16'];

const inputBase = `
  w-full px-3 py-2.5 rounded-lg border border-slate-200 bg-white
  text-sm text-slate-800 font-medium placeholder:text-slate-400 placeholder:font-normal
  focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F]
  transition-colors duration-150
`.trim();

const inputError = 'border-red-300 focus:border-red-400 focus:ring-red-200';

function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-[11px] font-medium text-red-500 flex items-center gap-1">
      <AlertCircle className="w-3 h-3 shrink-0" />{msg}
    </p>
  );
}

export default function AddVehicleModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    vehicle_number: '',
    vehicle_class: '',
    vehicle_type: '',
    engine_number: '',
    chassis_number: '',
  });
  const [rcFrontFile,   setRcFrontFile]   = useState(null);
  const [rcBackFile,    setRcBackFile]    = useState(null);
  const [dragOverFront, setDragOverFront] = useState(false);
  const [dragOverBack,  setDragOverBack]  = useState(false);
  const [submitting,    setSubmitting]    = useState(false);
  const [errors,        setErrors]        = useState({});
  const [apiError,      setApiError]      = useState('');
  const frontInputRef = useRef(null);
  const backInputRef  = useRef(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateFile = (file, sideName) => {
    if (!file) return `${sideName} is required.`;
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'jpg', 'jpeg', 'png'].includes(ext)) return 'Only PDF, JPG, JPEG and PNG are allowed.';
    if (file.size > 10 * 1024 * 1024) return 'File must be under 10 MB.';
    if (file.size === 0) return 'File appears to be empty.';
    return null;
  };

  const applyFrontFile = file => {
    const err = validateFile(file, 'RC Front');
    if (err) { setErrors(p => ({ ...p, rc_front_file: err })); setRcFrontFile(null); return; }
    setRcFrontFile(file);
    setErrors(p => ({ ...p, rc_front_file: '' }));
  };

  const applyBackFile = file => {
    const err = validateFile(file, 'RC Back');
    if (err) { setErrors(p => ({ ...p, rc_back_file: err })); setRcBackFile(null); return; }
    setRcBackFile(file);
    setErrors(p => ({ ...p, rc_back_file: '' }));
  };

  const handleFrontDrop = useCallback(e => {
    e.preventDefault(); setDragOverFront(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyFrontFile(f);
  }, []);

  const handleBackDrop = useCallback(e => {
    e.preventDefault(); setDragOverBack(false);
    const f = e.dataTransfer.files?.[0];
    if (f) applyBackFile(f);
  }, []);

  const validate = () => {
    const e = {};
    if (!form.vehicle_number.trim()) e.vehicle_number = 'Required';
    if (!form.vehicle_class)         e.vehicle_class  = 'Required';
    if (!form.vehicle_type.trim())   e.vehicle_type   = 'Required';
    if (!form.engine_number.trim())  e.engine_number  = 'Required';
    if (!form.chassis_number.trim()) e.chassis_number = 'Required';
    if (!rcFrontFile)                e.rc_front_file  = 'RC Front is required.';
    if (!rcBackFile)                 e.rc_back_file   = 'RC Back is required.';
    return e;
  };

  const handleSubmit = async () => {
    setApiError('');
    const fieldErrors = validate();
    if (Object.keys(fieldErrors).length > 0) { setErrors(fieldErrors); return; }

    const token = localStorage.getItem('access_token');
    if (!token) { setApiError('Session expired. Please log in again.'); return; }

    const fd = new FormData();
    fd.append('vehicle_number', form.vehicle_number.trim().toUpperCase());
    fd.append('vehicle_class',  form.vehicle_class);
    fd.append('vehicle_type',   form.vehicle_type.trim());
    fd.append('engine_number',  form.engine_number.trim().toUpperCase());
    fd.append('chassis_number', form.chassis_number.trim().toUpperCase());
    fd.append('rc_front_file',  rcFrontFile);
    fd.append('rc_back_file',   rcBackFile);

    setSubmitting(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/vehicles/add', fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(res.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setApiError(typeof detail === 'string' ? detail : 'Failed to add vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtSize = b => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl flex flex-col overflow-hidden" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00478F]/10 flex items-center justify-center">
              <Car className="w-4 h-4 text-[#00478F]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">Register Vehicle</h2>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-none">All fields are required</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

          {/* API error */}
          {apiError && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-red-700">{apiError}</p>
            </div>
          )}

          {/* Vehicle Number */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Vehicle Number
            </label>
            <input
              name="vehicle_number"
              value={form.vehicle_number}
              onChange={handleChange}
              placeholder="e.g. TN01AB1234"
              className={`${inputBase} ${errors.vehicle_number ? inputError : ''}`}
            />
            <FieldError msg={errors.vehicle_number} />
          </div>

          {/* Class + Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Vehicle Class
              </label>
              <select
                name="vehicle_class"
                value={form.vehicle_class}
                onChange={handleChange}
                className={`${inputBase} ${errors.vehicle_class ? inputError : ''} cursor-pointer`}
              >
                <option value="">Select</option>
                {VEHICLE_CLASSES.map(vc => <option key={vc} value={vc}>{vc}</option>)}
              </select>
              <FieldError msg={errors.vehicle_class} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <input
                name="vehicle_type"
                value={form.vehicle_type}
                onChange={handleChange}
                placeholder="Car, Truck, Bus…"
                className={`${inputBase} ${errors.vehicle_type ? inputError : ''}`}
              />
              <FieldError msg={errors.vehicle_type} />
            </div>
          </div>

          {/* Engine + Chassis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Engine Number
              </label>
              <input
                name="engine_number"
                value={form.engine_number}
                onChange={handleChange}
                placeholder="Engine no."
                className={`${inputBase} ${errors.engine_number ? inputError : ''}`}
              />
              <FieldError msg={errors.engine_number} />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Chassis Number
              </label>
              <input
                name="chassis_number"
                value={form.chassis_number}
                onChange={handleChange}
                placeholder="Chassis no."
                className={`${inputBase} ${errors.chassis_number ? inputError : ''}`}
              />
              <FieldError msg={errors.chassis_number} />
            </div>
          </div>

          {/* RC Uploads (Front & Back) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                RC Front Page
              </label>
              <div
                onClick={() => frontInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOverFront(true); }}
                onDragLeave={() => setDragOverFront(false)}
                onDrop={handleFrontDrop}
                className={`
                  border-2 border-dashed rounded-lg px-3 py-4 flex flex-col items-center text-center cursor-pointer transition-colors duration-150
                  ${dragOverFront
                    ? 'border-[#00478F] bg-blue-50/60'
                    : rcFrontFile
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : errors.rc_front_file
                        ? 'border-red-300 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }
                `}
              >
                <input ref={frontInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => applyFrontFile(e.target.files?.[0])} className="hidden" />

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-2 ${rcFrontFile ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {rcFrontFile
                    ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                    : <CloudUpload className={`w-4 h-4 ${dragOverFront ? 'text-[#00478F]' : 'text-slate-400'}`} />
                  }
                </div>

                <div className="min-w-0 w-full">
                  {rcFrontFile ? (
                    <>
                      <p className="text-xs font-semibold text-slate-800 leading-none truncate px-1">{rcFrontFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{fmtSize(rcFrontFile.size)} · Click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-600 leading-none">
                        {dragOverFront ? 'Drop front page' : 'Upload Front'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
              <FieldError msg={errors.rc_front_file} />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                RC Back Page
              </label>
              <div
                onClick={() => backInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOverBack(true); }}
                onDragLeave={() => setDragOverBack(false)}
                onDrop={handleBackDrop}
                className={`
                  border-2 border-dashed rounded-lg px-3 py-4 flex flex-col items-center text-center cursor-pointer transition-colors duration-150
                  ${dragOverBack
                    ? 'border-[#00478F] bg-blue-50/60'
                    : rcBackFile
                      ? 'border-emerald-300 bg-emerald-50/40'
                      : errors.rc_back_file
                        ? 'border-red-300 bg-red-50/20'
                        : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }
                `}
              >
                <input ref={backInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => applyBackFile(e.target.files?.[0])} className="hidden" />

                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mb-2 ${rcBackFile ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  {rcBackFile
                    ? <CheckCircle className="w-4 h-4 text-emerald-600" />
                    : <CloudUpload className={`w-4 h-4 ${dragOverBack ? 'text-[#00478F]' : 'text-slate-400'}`} />
                  }
                </div>

                <div className="min-w-0 w-full">
                  {rcBackFile ? (
                    <>
                      <p className="text-xs font-semibold text-slate-800 leading-none truncate px-1">{rcBackFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{fmtSize(rcBackFile.size)} · Click to change</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-600 leading-none">
                        {dragOverBack ? 'Drop back page' : 'Upload Back'}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">PDF, JPG, PNG up to 10MB</p>
                    </>
                  )}
                </div>
              </div>
              <FieldError msg={errors.rc_back_file} />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-lg bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {submitting
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Registering…</>
              : <><Upload className="w-3.5 h-3.5" />Register Vehicle</>
            }
          </button>
        </div>

      </div>
    </div>
  );
}
