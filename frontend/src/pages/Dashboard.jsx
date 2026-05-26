import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Topbar from '../components/Topbar';
import VehicleCard from '../components/VehicleCard';
import AddVehicleModal from '../components/AddVehicleModal';
import RechargeModal from '../components/RechargeModal';
import usePageTitle from '../hooks/usePageTitle';
import { useWallet } from '../context/WalletContext';
import {
  Wallet, Car, Activity, AlertTriangle,
  Plus, Download, HelpCircle, Phone, Mail,
  UserCheck, ShieldAlert, CheckCircle2, X, Zap
} from 'lucide-react';

// ── Mock transactions ─────────────────────────────────────────────────────────
const mockTransactions = [
  { id: 'TXN1001', date: '24 Oct 2026, 02:30 PM', plaza: 'Krishnagiri Toll Plaza', location: 'NH-44',  amount: '-₹85.00',   vehicle: 'TN01AB1234', status: 'SUCCESS' },
  { id: 'TXN1002', date: '23 Oct 2026, 10:15 AM', plaza: 'Vaniyambadi Toll Plaza', location: 'NH-48',  amount: '-₹60.00',   vehicle: 'TN01AB1234', status: 'SUCCESS' },
  { id: 'TXN1003', date: '22 Oct 2026, 06:45 PM', plaza: 'Walajah Toll Plaza',     location: 'NH-32',  amount: '-₹45.00',   vehicle: 'TN01AB1234', status: 'SUCCESS' },
  { id: 'TXN1004', date: '20 Oct 2026, 09:20 AM', plaza: 'Wallet Recharge',        location: 'Online', amount: '+₹500.00',  vehicle: '—',          status: 'CREDIT'  },
];

// ── Micro toast ───────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3"
      style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-800 leading-none">Vehicle registered</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, iconColor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-2xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h2>
      {action}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { balance, setBalance } = useWallet();
  const [data, setData] = useState({
    user: { name: 'Loading...', email: '', mobile_number: '' },
    vehicles: [],
    transactions: [],
    low_balance_alert_enabled: false,
    low_balance_threshold: 100,
  });
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  usePageTitle(showRechargeModal ? "Recharge Wallet" : "Dashboard");
  const [toast,     setToast]     = useState(null);

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/'); return; }
    try {
      const [res, transRes] = await Promise.all([
        axios.get('http://127.0.0.1:8000/dashboard/me', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get('http://127.0.0.1:8000/transactions/', {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);
      setBalance(res.data.wallet_balance.toFixed(2));
      setData({
        user: {
          name: res.data.full_name,
          email: res.data.email,
          mobile_number: res.data.mobile_number,
        },
        vehicles: res.data.vehicles,
        transactions: transRes.data.slice(0, 4),
        low_balance_alert_enabled: res.data.low_balance_alert_enabled,
        low_balance_threshold: res.data.low_balance_threshold,
      });
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, setBalance]);

  const updateAlertSettings = async (enabled, threshold) => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      await axios.put('http://127.0.0.1:8000/dashboard/alert-settings', {
        enabled: enabled,
        threshold: parseFloat(threshold)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(prev => ({
        ...prev,
        low_balance_alert_enabled: enabled,
        low_balance_threshold: threshold
      }));
      setToast(`Alert settings updated. Alerts: ${enabled ? 'ENABLED' : 'DISABLED'} (₹${threshold})`);
    } catch (err) {
      console.error(err);
      setToast("Failed to update alert settings.");
    }
  };

  const handleThresholdChange = (e) => {
    const newThreshold = parseInt(e.target.value, 10);
    updateAlertSettings(data.low_balance_alert_enabled, newThreshold);
  };

  const toggleAlerts = () => {
    const newEnabled = !data.low_balance_alert_enabled;
    updateAlertSettings(newEnabled, data.low_balance_threshold || 100);
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/'); return; }
    fetchData();
  }, [fetchData, navigate]);

  const handleLogout = () => { localStorage.removeItem('access_token'); navigate('/'); };

  // ── Vehicle added ────────────────────────────────────────────────────────
  const handleVehicleAdded = newVehicle => {
    setShowModal(false);
    setData(prev => ({
      ...prev,
      vehicles: [{
        vehicle_id:    newVehicle.vehicle_id,
        vehicle_number:newVehicle.vehicle_number,
        vehicle_class: newVehicle.vehicle_class,
        vehicle_type:  newVehicle.vehicle_type,
        fastag_status: newVehicle.fastag_status || 'INACTIVE',
        rc_verification_status: newVehicle.rc_verification_status || newVehicle.verification_status || 'PENDING',
      }, ...prev.vehicles],
    }));
    setToast(`${newVehicle.vehicle_number} added successfully.`);
    fetchData();
  };

  const activeCount  = data.vehicles.filter(v => v.fastag_status === 'ACTIVE').length;
  const pendingCount = data.vehicles.filter(v => (v.rc_verification_status || v.rc_status || v.verification_status) === 'PENDING').length;
  const isBalanceLow = parseFloat(balance) < 100;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(12px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
      `}</style>

      <Topbar user={data.user} balance={balance} handleLogout={handleLogout} onRechargeClick={() => setShowRechargeModal(true)} />

      {showModal && (
        <AddVehicleModal onClose={() => setShowModal(false)} onSuccess={handleVehicleAdded} />
      )}
      {showRechargeModal && (
        <RechargeModal 
          onClose={() => setShowRechargeModal(false)} 
          onSuccess={(res) => {
            setToast(`Recharge successful. New balance: ₹${res.new_balance}`);
            fetchData();
          }}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-7 space-y-6">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
            <h1 className="text-xl font-bold text-slate-900">
              {loading ? 'Loading…' : `${data.user.name}'s Dashboard`}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/simulate-toll-crossing')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              Simulate Toll Crossing
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Vehicle
            </button>
          </div>
        </div>

        {/* ── Low balance inline alert ─────────────────────────────────────── */}
        {isBalanceLow && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              Wallet balance is low — recharge to keep FASTags active.
            </div>
            <button 
              onClick={() => setShowRechargeModal(true)}
              className="text-xs font-semibold text-amber-700 border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-4">
              Recharge
            </button>
          </div>
        )}

        {/* ── Pending RC inline alert ─────────────────────────────────────── */}
        {pendingCount > 0 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2.5 text-sm font-medium text-blue-800">
              <AlertTriangle className="w-4 h-4 text-blue-500 shrink-0" />
              {pendingCount === 1 
                ? 'One of your vehicles requires an RC document upload for verification.' 
                : `${pendingCount} of your vehicles require RC document uploads for verification.`}
            </div>
            <button 
              onClick={() => {
                const pendingVehicle = data.vehicles.find(v => (v.rc_verification_status || v.rc_status || v.verification_status) === 'PENDING');
                if (pendingVehicle) navigate(`/vehicle/${pendingVehicle.vehicle_id}`);
              }}
              className="text-xs font-semibold text-blue-700 border border-blue-300 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ml-4">
              Review
            </button>
          </div>
        )}

        {/* ── Stat strip ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Wallet Balance"
            value={`₹${balance}`}
            sub="+ Recharge now"
            icon={Wallet}
            iconColor="text-[#00478F]"
          />
          <StatCard
            label="Total Vehicles"
            value={data.vehicles.length}
            sub={data.vehicles.length === 1 ? '1 registered' : `${data.vehicles.length} registered`}
            icon={Car}
            iconColor="text-slate-400"
          />
          <StatCard
            label="Active FASTags"
            value={activeCount}
            sub={activeCount === 0 ? 'None active' : `${activeCount} active`}
            icon={Activity}
            iconColor="text-emerald-500"
          />
          <StatCard
            label="Pending Review"
            value={pendingCount}
            sub={pendingCount === 0 ? 'All verified' : 'RC under review'}
            icon={AlertTriangle}
            iconColor="text-amber-500"
          />
        </div>

        {/* ── Main 3-col grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── Left/center — Vehicles + Transactions (9 cols) ──────────────── */}
          <div className="lg:col-span-9 space-y-6">

            {/* Vehicles panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <SectionHeader
                title="Fleet"
                action={
                  <button
                    onClick={() => navigate('/vehicles')}
                    className="text-xs font-semibold text-[#00478F] hover:text-[#003a75] transition-colors"
                  >
                    View all
                  </button>
                }
              />

              {loading ? (
                <div className="py-10 text-center text-sm text-slate-400 font-medium">Loading…</div>
              ) : data.vehicles.length === 0 ? (
                /* Empty state */
                <div className="border border-dashed border-slate-200 rounded-xl py-12 px-6 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <Car className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">No vehicles registered</h3>
                  <p className="text-xs text-slate-400 max-w-xs mb-5">
                    Add your first vehicle to manage FASTag status and view toll activity.
                  </p>
                  <button
                    id="add-vehicle-btn-empty"
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add first vehicle
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {data.vehicles.slice(0, 3).map(v => (
                    <VehicleCard key={v.vehicle_id} vehicle={v} />
                  ))}
                </div>
              )}
            </div>

            {/* Transactions panel */}
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <SectionHeader
                title="Recent Transactions"
                action={
                  <button onClick={() => navigate('/transactions')} className="text-xs font-semibold text-[#00478F] hover:text-[#003a75] transition-colors">
                    View all
                  </button>
                }
              />

              <div className="overflow-x-auto -mx-1">
                <table className="w-full text-left min-w-[520px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="pb-3 px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="pb-3 px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Description</th>
                      <th className="pb-3 px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Vehicle</th>
                      <th className="pb-3 px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="pb-3 px-1 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.transactions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="py-6 text-center text-xs font-semibold text-slate-400">
                          No recent transactions registered.
                        </td>
                      </tr>
                    ) : (
                      data.transactions.map((txn, i) => {
                        const isRecharge = txn.transaction_type === 'WALLET_RECHARGE';
                        return (
                          <tr key={txn.transaction_id || i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3 px-1 text-[11px] text-slate-400 font-medium whitespace-nowrap">{txn.created_at}</td>
                            <td className="py-3 px-1">
                              <p className="text-sm font-semibold text-slate-800 leading-none">{txn.plaza_name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">{isRecharge ? 'Wallet Recharge' : 'Toll Deduction'}</p>
                            </td>
                            <td className="py-3 px-1 text-[11px] font-mono text-slate-500">{txn.vehicle_number}</td>
                            <td className={`py-3 px-1 text-sm font-semibold text-right whitespace-nowrap ${isRecharge ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {isRecharge ? '+' : '-'}₹{txn.amount.toFixed(2)}
                            </td>
                            <td className="py-3 px-1 text-right">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                isRecharge ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                                txn.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' :
                                txn.status === 'FAILED' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                                'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                              }`}>
                                {isRecharge ? 'CREDIT' : txn.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* ── Right sidebar (3 cols) ───────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Quick actions */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</p>
              <div className="space-y-1">
                {[
                  { label: 'Add Vehicle',         icon: Plus,     onClick: () => setShowModal(true), id: 'quick-add-vehicle-btn' },
                  { label: 'Recharge Wallet',     icon: Wallet,   onClick: () => setShowRechargeModal(true), id: 'quick-recharge-btn' },
                  { label: 'Download Statement',  icon: Download, onClick: () => navigate('/transactions'), id: 'quick-statement-btn' },
                  { label: 'Get Support',         icon: HelpCircle,onClick:() => navigate('/support'),      id: 'quick-support-btn' },
                ].map(({ label, icon: Icon, onClick, id }) => (
                  <button
                    key={label}
                    id={id}
                    onClick={onClick}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Alert promo */}
            <div className="bg-[#00478F] rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-200 shrink-0" />
                <p className="text-sm font-semibold text-white leading-none">Low Balance Alerts</p>
              </div>
              <p className="text-[11px] text-blue-200 leading-relaxed">
                Get notified when your wallet balance falls below the threshold.
              </p>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs text-blue-100">
                  <span className="font-medium">Threshold:</span>
                  <select
                    value={data.low_balance_threshold || 100}
                    onChange={handleThresholdChange}
                    className="bg-[#00356b] border border-blue-400/30 rounded px-2 py-1 text-white text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="100">₹100</option>
                    <option value="150">₹150</option>
                  </select>
                </div>
                <button
                  onClick={toggleAlerts}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all border ${
                    data.low_balance_alert_enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm'
                      : 'border-blue-400/50 text-blue-100 hover:bg-white/10'
                  }`}
                >
                  {data.low_balance_alert_enabled ? 'Alerts: ENABLED' : 'Enable Alerts'}
                </button>
              </div>
            </div>

            {/* Account info */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Account</p>
              <div className="space-y-3">
                {[
                  { icon: UserCheck, label: 'Type',   value: 'Corporate Account' },
                  { icon: Phone,     label: 'Mobile', value: data.user.mobile_number || '+91 91500 00000' },
                  { icon: Mail,      label: 'Email',  value: data.user.email || '—', truncate: true },
                ].map(({ icon: Icon, label, value, truncate }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 uppercase leading-none tracking-wide">{label}</p>
                      <p className={`text-xs font-semibold text-slate-700 mt-0.5 ${truncate ? 'truncate' : ''}`}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium">
        © 2026 GI Technology · All rights reserved
      </footer>
    </div>
  );
}
