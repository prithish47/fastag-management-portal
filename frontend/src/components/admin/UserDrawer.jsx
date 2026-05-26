import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  X, User, Mail, Phone, Wallet, Car, Shield, Clock,
  ArrowDownRight, ArrowUpRight, UserCheck, UserX, FileSearch,
  ChevronRight, Activity
} from 'lucide-react';

const API = 'http://127.0.0.1:8000/admin';
const token = () => sessionStorage.getItem('admin_access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_BADGE = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  DISABLED: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};
const FASTAG_BADGE = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  DISABLED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
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
const TIMELINE_ICON = {
  transaction: { color: 'bg-emerald-50 text-emerald-600', fallback: 'bg-slate-100 text-slate-500' },
  activity: { color: 'bg-blue-50 text-blue-600' },
  notification: { color: 'bg-amber-50 text-amber-600' },
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

export default function UserDrawer({ userId, onClose, onOpenVehicle, onRefreshParent }) {
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('summary');

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [userRes, txnRes, tlRes] = await Promise.all([
        axios.get(`${API}/users/${userId}`, { headers: headers() }),
        axios.get(`${API}/users/${userId}/transactions?limit=10`, { headers: headers() }),
        axios.get(`${API}/users/${userId}/activity-timeline?limit=25`, { headers: headers() }),
      ]);
      setUser(userRes.data);
      setTransactions(txnRes.data);
      setTimeline(tlRes.data);
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (newStatus) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/users/${userId}/status`, { account_status: newStatus }, { headers: headers() });
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceRcReview = async (vehicleId) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/vehicles/${vehicleId}/rc-status`, { status: 'PENDING' }, { headers: headers() });
      fetchData();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reset RC');
    } finally {
      setActionLoading(false);
    }
  };

  if (!userId) return null;

  const sections = [
    { key: 'summary', label: 'Summary' },
    { key: 'vehicles', label: `Vehicles${user ? ` (${user.vehicles?.length || 0})` : ''}` },
    { key: 'transactions', label: 'Transactions' },
    { key: 'timeline', label: 'Timeline' },
    { key: 'actions', label: 'Actions' },
  ];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-[580px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-xl">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00478F] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-none">{user?.full_name || 'Loading...'}</h2>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">User Operations</p>
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

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">Loading user data...</div>
          ) : !user ? (
            <div className="py-16 text-center text-sm text-slate-400 font-medium">User not found</div>
          ) : (
            <div className="p-5">
              {/* SUMMARY */}
              {activeSection === 'summary' && (
                <div className="space-y-1">
                  <InfoRow icon={User} label="Full Name" value={user.full_name} />
                  <InfoRow icon={Mail} label="Email" value={user.email} mono />
                  <InfoRow icon={Phone} label="Mobile" value={user.mobile_number} mono />
                  <InfoRow icon={Shield} label="Role" value={user.role} badge badgeClass={user.role === 'ADMIN' ? 'bg-blue-50 text-[#00478F] ring-1 ring-blue-200' : 'bg-slate-100 text-slate-600'} />
                  <InfoRow icon={Shield} label="Account Status" value={user.account_status} badge badgeClass={STATUS_BADGE[user.account_status]} />
                  <InfoRow icon={Wallet} label="Wallet Balance" value={`Rs.${user.wallet_balance.toFixed(2)}`} />
                  <InfoRow icon={Clock} label="Member Since" value={user.created_at} />
                  <InfoRow icon={Car} label="Total Vehicles" value={user.vehicles?.length || 0} />
                  <InfoRow icon={Activity} label="Last Activity" value={user.last_activity || 'No activity'} />
                </div>
              )}

              {/* LINKED VEHICLES */}
              {activeSection === 'vehicles' && (
                <div>
                  {(!user.vehicles || user.vehicles.length === 0) ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No linked vehicles</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">FASTag</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">RC</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Wallet</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {user.vehicles.map(v => (
                            <tr
                              key={v.vehicle_id}
                              onClick={() => onOpenVehicle?.(v.vehicle_id)}
                              className="hover:bg-slate-50 cursor-pointer transition-colors"
                            >
                              <td className="py-2.5 px-3">
                                <p className="text-xs font-bold font-mono text-slate-900">{v.vehicle_number}</p>
                                {v.fastag_id && <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Tag: {v.fastag_id}</p>}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${FASTAG_BADGE[v.fastag_status] || FASTAG_BADGE.INACTIVE}`}>
                                  {v.fastag_status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${RC_BADGE[v.rc_verification_status] || RC_BADGE.PENDING}`}>
                                  {v.rc_verification_status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[10px] font-semibold ${v.wallet_sufficient ? 'text-emerald-600' : 'text-red-500'}`}>
                                  {v.wallet_sufficient ? 'OK' : 'LOW'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <ChevronRight className="w-3 h-3 text-slate-300" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* RECENT TRANSACTIONS */}
              {activeSection === 'transactions' && (
                <div>
                  {transactions.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No transactions found</p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ref</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                            <th className="py-2.5 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {transactions.map(t => {
                            const isRecharge = t.transaction_type === 'WALLET_RECHARGE';
                            return (
                              <tr key={t.transaction_id} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3">
                                  <span className="text-[10px] font-mono font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {t.reference_number || `TXN${String(t.transaction_id).padStart(4, '0')}`}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1">
                                    <div className={`p-0.5 rounded-full ${isRecharge ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                      {isRecharge ? <ArrowDownRight className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-600">{isRecharge ? 'Recharge' : 'Toll'}</span>
                                  </div>
                                </td>
                                <td className={`py-2.5 px-3 text-right text-xs font-bold ${isRecharge ? 'text-emerald-600' : 'text-slate-900'}`}>
                                  {isRecharge ? '+' : '-'}Rs.{t.amount.toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${TXN_STATUS[t.status] || ''}`}>
                                    {t.status}
                                  </span>
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

              {/* ACTIVITY TIMELINE */}
              {activeSection === 'timeline' && (
                <div>
                  {timeline.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400 font-medium">No activity recorded</p>
                  ) : (
                    <div className="relative pl-6">
                      {/* Vertical line */}
                      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-200" />
                      <div className="space-y-0">
                        {timeline.map((item, i) => {
                          const cfg = TIMELINE_ICON[item.type] || TIMELINE_ICON.activity;
                          const dotColor = item.type === 'transaction' && item.status === 'FAILED'
                            ? 'bg-red-400'
                            : item.type === 'transaction' ? 'bg-emerald-400'
                            : item.type === 'notification' ? 'bg-amber-400'
                            : 'bg-blue-400';
                          return (
                            <div key={i} className="relative py-2.5">
                              {/* Dot */}
                              <div className={`absolute -left-6 top-3.5 w-[7px] h-[7px] rounded-full ${dotColor} ring-2 ring-white`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-slate-800">{item.event}</span>
                                  {item.vehicle_number && (
                                    <span className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                      {item.vehicle_number}
                                    </span>
                                  )}
                                  {item.status && (
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${TXN_STATUS[item.status] || ''}`}>
                                      {item.status}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">{item.detail}</p>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">{item.display_time}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADMIN ACTIONS */}
              {activeSection === 'actions' && (
                <div className="space-y-4">
                  {/* Account Actions */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Account Status</p>
                    <div className="flex flex-wrap gap-2">
                      {user.account_status !== 'ACTIVE' && (
                        <button
                          onClick={() => handleStatusChange('ACTIVE')}
                          disabled={actionLoading || user.role === 'ADMIN'}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                        >
                          <UserCheck className="w-3.5 h-3.5" /> Activate User
                        </button>
                      )}
                      {user.account_status !== 'SUSPENDED' && (
                        <button
                          onClick={() => handleStatusChange('SUSPENDED')}
                          disabled={actionLoading || user.role === 'ADMIN'}
                          className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-40"
                        >
                          <UserX className="w-3.5 h-3.5" /> Suspend User
                        </button>
                      )}
                      {user.account_status !== 'DISABLED' && (
                        <button
                          onClick={() => handleStatusChange('DISABLED')}
                          disabled={actionLoading || user.role === 'ADMIN'}
                          className="flex items-center gap-1.5 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40"
                        >
                          <UserX className="w-3.5 h-3.5" /> Disable User
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Vehicle Actions */}
                  {user.vehicles && user.vehicles.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Force RC Review</p>
                      <div className="space-y-1.5">
                        {user.vehicles.filter(v => v.rc_verification_status !== 'PENDING').map(v => (
                          <button
                            key={v.vehicle_id}
                            onClick={() => handleForceRcReview(v.vehicle_id)}
                            disabled={actionLoading}
                            className="flex items-center justify-between w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
                          >
                            <div className="flex items-center gap-2">
                              <FileSearch className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-xs font-mono font-semibold text-slate-700">{v.vehicle_number}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-amber-600">Reset to PENDING</span>
                          </button>
                        ))}
                      </div>
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
