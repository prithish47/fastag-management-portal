import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Topbar from '../components/Topbar';
import VehicleCard from '../components/VehicleCard';
import AddVehicleModal from '../components/AddVehicleModal';
import RechargeModal from '../components/RechargeModal';
import usePageTitle from '../hooks/usePageTitle';
import { useWallet } from '../context/WalletContext';
import { Car, Plus, CheckCircle2, X } from 'lucide-react';

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
        <p className="text-xs font-semibold text-slate-800 leading-none">Vehicle Update</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function Vehicles() {
  const navigate = useNavigate();
  const { balance, setBalance } = useWallet();
  const [data, setData] = useState({
    user: { name: 'Loading...', email: '', mobile_number: '' },
    vehicles: [],
  });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  usePageTitle(showRechargeModal ? "Recharge Wallet" : "My Vehicles");
  const [toast, setToast] = useState(null);

  // ── Data fetch ───────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const token = localStorage.getItem('access_token');
    if (!token) { navigate('/'); return; }
    try {
      const res = await axios.get('http://127.0.0.1:8000/dashboard/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalance(res.data.wallet_balance.toFixed(2));
      setData({
        user: {
          name: res.data.full_name,
          email: res.data.email,
          mobile_number: res.data.mobile_number,
        },
        vehicles: res.data.vehicles,
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
        rc_status:     newVehicle.verification_status || 'PENDING',
      }, ...prev.vehicles],
    }));
    setToast(`${newVehicle.vehicle_number} added successfully.`);
    fetchData();
  };

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
            <h1 className="text-xl font-bold text-slate-900">
              My Vehicles
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage your registered vehicles, FASTag status, and document uploads.
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Vehicle
          </button>
        </div>

        {/* ── Vehicles grid ───────────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
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
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add first vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {data.vehicles.map(v => (
                <VehicleCard key={v.vehicle_id} vehicle={v} />
              ))}
            </div>
          )}
        </div>

      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium mt-auto">
        © 2026 GI Technology · All rights reserved
      </footer>
    </div>
  );
}
