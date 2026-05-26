import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  X, Tag, Shield, Clock, Car, User, AlertTriangle,
  RotateCcw, Ban
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/admin';
const token = () => sessionStorage.getItem('admin_access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_BADGE = {
  UNASSIGNED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  ASSIGNED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  ACTIVE: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  DISABLED: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  BLACKLISTED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  REPLACED: 'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
  DAMAGED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  AVAILABLE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
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

export default function FastagDrawer({ tagId, onClose, onRefreshParent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('info');

  const fetchData = useCallback(async () => {
    if (!tagId) return;
    setLoading(true);
    try {
      const res = await axios.get(`${API}/fastag-inventory/${tagId}`, { headers: headers() });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tagId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (action) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/fastag-inventory/${tagId}/status`, { action }, { headers: headers() });
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (!tagId) return null;

  const sections = [
    { key: 'info', label: 'Asset Info' },
    { key: 'lifecycle', label: 'Lifecycle' },
    { key: 'actions', label: 'Actions' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 w-full max-w-[520px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-mono text-slate-900 leading-none">{data?.fastag_id || 'Loading...'}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">FASTag Asset</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-5 flex gap-0.5 shrink-0">
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
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Loading FASTag data...</div>
          ) : !data ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Tag not found</div>
          ) : (
            <div className="p-5">
              {/* ASSET INFO */}
              {activeSection === 'info' && (
                <div className="space-y-1">
                  <InfoRow icon={Tag} label="FASTag ID" value={data.fastag_id} mono />
                  <InfoRow icon={Tag} label="Serial Number" value={data.tag_serial_number} mono />
                  <InfoRow icon={Car} label="Vehicle Class" value={data.vehicle_class} />
                  <InfoRow icon={Shield} label="Status" value={data.status} badge badgeClass={STATUS_BADGE[data.status] || STATUS_BADGE.INACTIVE} />
                  <InfoRow icon={Shield} label="Blacklisted" value={data.is_blacklisted ? 'Yes' : 'No'} />

                  {/* Assigned Vehicle */}
                  {data.assigned_vehicle ? (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Vehicle</p>
                      </div>
                      <InfoRow icon={Car} label="Vehicle" value={data.assigned_vehicle.vehicle_number} mono />
                      <InfoRow icon={Car} label="Class" value={data.assigned_vehicle.vehicle_class} />
                    </>
                  ) : (
                    <InfoRow icon={Car} label="Assigned Vehicle" value="Not assigned" />
                  )}

                  {/* Owner */}
                  {data.assigned_owner ? (
                    <>
                      <div className="pt-3 pb-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Owner</p>
                      </div>
                      <InfoRow icon={User} label="Name" value={data.assigned_owner.full_name} />
                      <InfoRow icon={User} label="Email" value={data.assigned_owner.email} mono />
                    </>
                  ) : null}

                  {/* Dates */}
                  <div className="pt-3 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dates</p>
                  </div>
                  <InfoRow icon={Clock} label="Issued" value={data.issued_at} />
                  <InfoRow icon={Clock} label="Activated" value={data.activated_at} />
                  <InfoRow icon={Clock} label="Last Assigned" value={data.last_assigned_at} />
                  <InfoRow icon={Clock} label="Created" value={data.created_at} />
                </div>
              )}

              {/* LIFECYCLE */}
              {activeSection === 'lifecycle' && (
                <div>
                  {(!data.lifecycle || data.lifecycle.length === 0) ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No lifecycle events</p>
                  ) : (
                    <div className="relative pl-6">
                      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                      {data.lifecycle.map((item, i) => {
                        const dotColor =
                          item.event.includes('Blacklisted') ? 'bg-red-400' :
                          item.event.includes('Activated') ? 'bg-emerald-400' :
                          item.event.includes('Damaged') ? 'bg-amber-400' :
                          item.event.includes('Issued') ? 'bg-blue-400' :
                          'bg-slate-400';
                        return (
                          <div key={i} className="relative py-3">
                            <div className={`absolute -left-6 top-4 w-[7px] h-[7px] rounded-full ${dotColor} ring-2 ring-white`} />
                            <p className="text-[11px] font-semibold text-slate-800">{item.event}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">{item.detail}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{item.display_time}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ACTIONS */}
              {activeSection === 'actions' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Inventory Operations</p>
                    <div className="flex flex-wrap gap-2">
                      {data.status !== 'BLACKLISTED' && (
                        <button
                          onClick={() => handleAction('BLACKLIST')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <Ban className="w-3.5 h-3.5" /> Blacklist Tag
                        </button>
                      )}

                      {(data.status === 'BLACKLISTED' || data.status === 'DAMAGED' || data.status === 'INACTIVE') && (
                        <button
                          onClick={() => handleAction('REACTIVATE')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Reactivate Tag
                        </button>
                      )}

                      {data.status !== 'DAMAGED' && (
                        <button
                          onClick={() => handleAction('MARK_DAMAGED')}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Mark Damaged
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Info notice */}
                  <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Note</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Blacklisting or marking as damaged will automatically unassign the tag from any vehicle and disable the vehicle's FASTag. The owner will receive a system notification.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
