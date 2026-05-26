import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  X, Car, User, Wallet, Tag, Shield, Clock, FileText,
  Zap, ZapOff, RefreshCw, FileCheck, FileSearch, ArrowLeft,
  Activity, ArrowUpRight, ZoomIn, AlertTriangle
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/admin';
const token = () => sessionStorage.getItem('admin_access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const FASTAG_BADGE = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  DISABLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  FASTAG_PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  UNASSIGNED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  BLACKLISTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  DAMAGED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  REPLACED: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
};
const RC_BADGE = {
  VERIFIED: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  PENDING: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  REJECTED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};
const TXN_STATUS = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  FAILED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

function InfoRow({ icon: Icon, label, value, mono, badge, badgeClass }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      {badge ? (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>{value}</span>
      ) : (
        <span className={`text-xs font-semibold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>{value || '-'}</span>
      )}
    </div>
  );
}

export default function VehicleDrawer({ vehicleId, onClose, onBack, backLabel, onRefreshParent }) {
  const [data, setData] = useState(null);
  const [tollHistory, setTollHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');
  const [zoomImage, setZoomImage] = useState(null);
  const [clearSide, setClearSide] = useState(null); // 'front' or 'back'
  const [clearRemark, setClearRemark] = useState('');

  const fetchData = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const [detailRes, txnRes] = await Promise.all([
        axios.get(`${API}/vehicles/${vehicleId}`, { headers: headers() }),
        axios.get(`${API}/transactions?vehicle_id=${vehicleId}&page_size=15`, { headers: headers() }),
      ]);
      setData(detailRes.data);
      setTollHistory(txnRes.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFastagAction = async (action) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/vehicles/${vehicleId}/fastag`, { action }, { headers: headers() });
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRcAction = async (status) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/vehicles/${vehicleId}/rc-status`, { status }, { headers: headers() });
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearRc = async (side) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/vehicles/${vehicleId}/clear-rc/${side}`, { reason: clearRemark }, { headers: headers() });
      setClearSide(null);
      setClearRemark('');
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to clear RC document');
    } finally {
      setActionLoading(false);
    }
  };

  if (!vehicleId) return null;

  const vehicle = data?.vehicle;
  const owner = data?.owner;
  const fastagInfo = data?.assigned_fastag;
  const activities = data?.activities || [];

  const sections = [
    { key: 'summary', label: 'Summary' },
    { key: 'fastag', label: 'FASTag' },
    { key: 'tolls', label: 'Toll History' },
    { key: 'operations', label: 'Operations' },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />

      {/* Image Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4 sm:p-10" onClick={() => setZoomImage(null)}>
          <button 
            className="absolute top-5 right-5 p-2 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); setZoomImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomImage === vehicle?.rc_front_path ? `http://127.0.0.1:8000/vehicles/download/rc/${vehicle?.vehicle_id}/front?token=${sessionStorage.getItem('admin_access_token')}` : `http://127.0.0.1:8000/vehicles/download/rc/${vehicle?.vehicle_id}/back?token=${sessionStorage.getItem('admin_access_token')}`} 
            alt="RC Document Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <div className="fixed inset-y-0 right-0 w-full max-w-[580px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-1 text-[11px] font-semibold text-[#00478F] hover:text-[#003a75] mr-1 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                {backLabel || 'Back'}
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-900 leading-none">{vehicle?.vehicle_number || 'Loading...'}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Vehicle Operations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="border-b border-slate-100 px-5 flex gap-0.5 shrink-0 overflow-x-auto">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeSection === s.key
                  ? 'text-[#00478F] border-[#00478F]'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Loading vehicle data...</div>
          ) : !vehicle ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Vehicle not found</div>
          ) : (
            <div className="p-5">
              {/* SUMMARY */}
              {activeSection === 'summary' && (
                <div className="space-y-3">
                  {(vehicle.fastag_status === 'FASTAG_PENDING' || !fastagInfo) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2.5 text-amber-800">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold">FASTag Assignment Required</p>
                        <p className="text-[11px] mt-0.5 leading-relaxed text-amber-700">
                          This vehicle has no active FASTag linked. Its operational status is set to <span className="font-semibold">FASTAG_PENDING</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <InfoRow icon={Car} label="Vehicle Number" value={vehicle.vehicle_number} mono />
                    <InfoRow icon={Tag} label="Vehicle Class" value={vehicle.vehicle_class} />
                    <InfoRow icon={Car} label="Vehicle Type" value={vehicle.vehicle_type || 'N/A'} />
                    <InfoRow icon={User} label="Owner" value={owner?.full_name} />
                    <InfoRow icon={Tag} label="FASTag ID" value={fastagInfo?.fastag_id || 'Not assigned'} mono />
                    <InfoRow icon={Zap} label="FASTag Status" value={vehicle.fastag_status || 'INACTIVE'} badge badgeClass={FASTAG_BADGE[vehicle.fastag_status] || FASTAG_BADGE.INACTIVE} />
                    <InfoRow icon={FileText} label="RC Status" value={vehicle.rc_verification_status || 'PENDING'} badge badgeClass={RC_BADGE[vehicle.rc_verification_status] || RC_BADGE.PENDING} />
                    <InfoRow icon={Wallet} label="Owner Wallet" value={owner ? `Rs.${owner.wallet_balance.toFixed(2)}` : '-'} />
                    <InfoRow icon={Clock} label="Registered" value={vehicle.created_at} />
                  </div>
                </div>
              )}

              {/* FASTAG INFO */}
              {activeSection === 'fastag' && (
                <div>
                  {fastagInfo ? (
                    <div className="space-y-1">
                      <InfoRow icon={Tag} label="FASTag ID" value={fastagInfo.fastag_id} mono />
                      <InfoRow icon={Tag} label="Serial Number" value={fastagInfo.tag_serial_number} mono />
                      <InfoRow icon={Shield} label="Tag Status" value={fastagInfo.status} badge badgeClass={FASTAG_BADGE[fastagInfo.status] || 'bg-slate-100 text-slate-500'} />
                      <InfoRow icon={Clock} label="Activation Date" value={fastagInfo.activated_at} />
                      <InfoRow icon={Clock} label="Last Assigned" value={fastagInfo.last_assigned_at} />
                      <InfoRow icon={Shield} label="Blacklisted" value={fastagInfo.is_blacklisted ? 'Yes' : 'No'} />
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <Tag className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-400 font-medium">No FASTag assigned</p>
                      <p className="text-[10px] text-slate-400 mt-1">Use Operations tab to assign a FASTag</p>
                    </div>
                  )}
                </div>
              )}

              {/* TOLL CROSSING HISTORY */}
              {activeSection === 'tolls' && (
                <div>
                  {tollHistory.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No toll history</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plaza / Type</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {tollHistory.map(t => {
                            const isRecharge = t.transaction_type === 'WALLET_RECHARGE';
                            return (
                              <tr key={t.transaction_id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3">
                                  <p className="text-[11px] font-semibold text-slate-700">{t.plaza_name || (isRecharge ? 'Wallet Recharge' : 'Toll')}</p>
                                </td>
                                <td className={`py-2.5 px-3 text-right text-xs font-bold ${isRecharge ? 'text-emerald-600' : 'text-slate-900'}`}>
                                  {isRecharge ? '+' : '-'}Rs.{t.amount.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${TXN_STATUS[t.status] || ''}`}>
                                    {t.status}
                                  </span>
                                  {t.status === 'FAILED' && t.failure_reason && (
                                    <p className="text-[8px] font-bold text-red-500 mt-0.5 uppercase tracking-wide leading-none">
                                      {t.failure_reason.replace('_', ' ')}
                                    </p>
                                  )}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{t.created_at}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* VEHICLE OPERATIONS */}
              {activeSection === 'operations' && (
                <div className="space-y-4">
                  {/* FASTag Actions */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">FASTag Operations</p>
                    <div className="flex flex-wrap gap-2">
                      {vehicle.fastag_status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleFastagAction('DISABLE')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <ZapOff className="w-3.5 h-3.5" /> Disable FASTag
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFastagAction('ENABLE')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                        >
                          <Zap className="w-3.5 h-3.5" /> Enable FASTag
                        </button>
                      )}
                      <button
                        onClick={() => handleFastagAction('REPLACE')}
                        disabled={actionLoading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Replace FASTag
                      </button>
                    </div>
                  </div>

                  {/* RC Actions */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">RC Verification</p>
                      {vehicle.rc_verification_status === 'PENDING' && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-amber-50 text-amber-600 ring-1 ring-amber-200">
                          Review Required
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      {vehicle.rc_verification_status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleRcAction('VERIFIED')}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40"
                          >
                            <FileCheck className="w-3.5 h-3.5" /> Approve RC
                          </button>
                          <button
                            onClick={() => handleRcAction('REJECTED')}
                            disabled={actionLoading}
                            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                          >
                            <X className="w-3.5 h-3.5" /> Reject RC
                          </button>
                        </>
                      )}
                      {vehicle.rc_verification_status !== 'PENDING' && (
                        <button
                          onClick={() => handleRcAction('PENDING')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                          <FileSearch className="w-3.5 h-3.5" /> Force RC Review
                        </button>
                      )}
                    </div>

                    {/* RC Document & DB Details Comparison */}
                    <div className="grid grid-cols-1 gap-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-slate-200 rounded-lg p-3 bg-slate-50">
                        {/* Front Document */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">RC Front Document</p>
                          {vehicle.rc_front_path ? (
                            <div className="space-y-2">
                              <div 
                                className="border border-slate-200 rounded-lg overflow-hidden bg-white aspect-video relative flex items-center justify-center group cursor-pointer"
                                onClick={() => setZoomImage(vehicle.rc_front_path)}
                              >
                                <img 
                                  src={`http://127.0.0.1:8000/vehicles/download/rc/${vehicle.vehicle_id}/front?token=${sessionStorage.getItem('admin_access_token')}`} 
                                  alt="RC Front" 
                                  className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="bg-white/90 p-2 rounded-full shadow-lg text-slate-700">
                                    <ZoomIn className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-400 p-4 text-center bg-white">
                                  <FileText className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-[10px] font-medium">Preview unavailable (PDF/Doc)</span>
                                </div>
                              </div>
                              
                              {/* Clear & Request Re-upload action */}
                              {clearSide === 'front' ? (
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                  <input 
                                    type="text" 
                                    placeholder="Enter remark (e.g. Blurry photo)" 
                                    value={clearRemark} 
                                    onChange={(e) => setClearRemark(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00478F]"
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <button 
                                      onClick={() => setClearSide(null)}
                                      className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => handleClearRc('front')}
                                      disabled={actionLoading}
                                      className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                                    >
                                      Clear & Request
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => { setClearSide('front'); setClearRemark(''); }}
                                  className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold text-red-700 transition-colors"
                                >
                                  Clear Front & Request Re-upload
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="border border-slate-200 border-dashed rounded-lg bg-white aspect-video flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <FileText className="w-6 h-6 mb-1 opacity-50" />
                              <span className="text-[10px] font-medium">No front document uploaded</span>
                            </div>
                          )}
                        </div>

                        {/* Back Document */}
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">RC Back Document</p>
                          {vehicle.rc_back_path ? (
                            <div className="space-y-2">
                              <div 
                                className="border border-slate-200 rounded-lg overflow-hidden bg-white aspect-video relative flex items-center justify-center group cursor-pointer"
                                onClick={() => setZoomImage(vehicle.rc_back_path)}
                              >
                                <img 
                                  src={`http://127.0.0.1:8000/vehicles/download/rc/${vehicle.vehicle_id}/back?token=${sessionStorage.getItem('admin_access_token')}`} 
                                  alt="RC Back" 
                                  className="object-contain w-full h-full transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <div className="bg-white/90 p-2 rounded-full shadow-lg text-slate-700">
                                    <ZoomIn className="w-5 h-5" />
                                  </div>
                                </div>
                                <div className="hidden absolute inset-0 flex-col items-center justify-center text-slate-400 p-4 text-center bg-white">
                                  <FileText className="w-6 h-6 mb-1 opacity-50" />
                                  <span className="text-[10px] font-medium">Preview unavailable (PDF/Doc)</span>
                                </div>
                              </div>

                              {/* Clear & Request Re-upload action */}
                              {clearSide === 'back' ? (
                                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                                  <input 
                                    type="text" 
                                    placeholder="Enter remark (e.g. Blurry photo)" 
                                    value={clearRemark} 
                                    onChange={(e) => setClearRemark(e.target.value)}
                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#00478F]"
                                  />
                                  <div className="flex gap-1.5 justify-end">
                                    <button 
                                      onClick={() => setClearSide(null)}
                                      className="px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded transition-colors"
                                    >
                                      Cancel
                                    </button>
                                    <button 
                                      onClick={() => handleClearRc('back')}
                                      disabled={actionLoading}
                                      className="px-2 py-1 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                                    >
                                      Clear & Request
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => { setClearSide('back'); setClearRemark(''); }}
                                  className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 rounded text-[10px] font-bold text-red-700 transition-colors"
                                >
                                  Clear Back & Request Re-upload
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="border border-slate-200 border-dashed rounded-lg bg-white aspect-video flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                              <FileText className="w-6 h-6 mb-1 opacity-50" />
                              <span className="text-[10px] font-medium">No back document uploaded</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">DB Registration Info</p>
                        <div className="grid grid-cols-3 gap-3 bg-white border border-slate-200 rounded-lg p-2.5">
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold">Vehicle Number</p>
                            <p className="text-xs font-bold text-slate-900 font-mono mt-0.5">{vehicle.vehicle_number}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold">Engine Number</p>
                            <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5">{vehicle.engine_number || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 uppercase font-semibold">Chassis Number</p>
                            <p className="text-xs font-semibold text-slate-700 font-mono mt-0.5">{vehicle.chassis_number || '—'}</p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVITY FEED */}
              {activeSection === 'activity' && (
                <div>
                  {activities.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No activity recorded</p>
                  ) : (
                    <div className="relative pl-6">
                      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                      {activities.map((a, i) => (
                        <div key={a.log_id || i} className="relative py-2.5">
                          <div className="absolute -left-6 top-3.5 w-[7px] h-[7px] rounded-full bg-blue-400 ring-2 ring-white" />
                          <p className="text-[11px] font-semibold text-slate-800">{a.activity_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{a.activity_message}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{a.created_at}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
