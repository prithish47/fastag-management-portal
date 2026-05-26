import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Topbar from '../components/Topbar';
import RechargeModal from '../components/RechargeModal';
import usePageTitle from '../hooks/usePageTitle';
import { useWallet } from '../context/WalletContext';
import {
  ArrowLeft, Car, Wallet, ShieldAlert,
  AlertTriangle, CheckCircle2, Lock, Unlock,
  Clock, RefreshCw, X, HelpCircle, Activity,
  AlertCircle
} from 'lucide-react';

export default function SimulateTollCrossing() {
  usePageTitle('Simulate Toll Crossing');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { balance, setBalance } = useWallet();

  // Route/User data states
  const [user, setUser] = useState({ name: 'Loading...', email: '', mobile_number: '' });
  const [vehicles, setVehicles] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showRechargeModal, setShowRechargeModal] = useState(false);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedPlazaOption, setSelectedPlazaOption] = useState('Krishnagiri Toll Plaza');
  const [customPlazaName, setCustomPlazaName] = useState('');
  const [amount, setAmount] = useState('85');
  const [locationState, setLocationState] = useState('Tamil Nadu');
  const [remarks, setRemarks] = useState('');

  // Simulation execution states
  const [simulating, setSimulating] = useState(false);
  const [result, setResult] = useState(null); // { success, barrier_state, failure_reason, reference_number, amount, plaza_name, wallet_balance_after, timestamp }
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // History state
  const [recentTolls, setRecentTolls] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Predefined plazas config
  const predefinedPlazas = [
    { name: 'Krishnagiri Toll Plaza', state: 'Tamil Nadu', amount: '85' },
    { name: 'Walajah Toll Plaza', state: 'Tamil Nadu', amount: '45' },
    { name: 'Chittor Toll Plaza', state: 'Andhra Pradesh', amount: '120' },
  ];

  // Fetch dashboard data & vehicles
  const fetchUserData = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
      return;
    }
    try {
      setLoadingData(true);
      const res = await axios.get('http://127.0.0.1:8000/dashboard/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser({
        name: res.data.full_name,
        email: res.data.email,
        mobile_number: res.data.mobile_number,
      });
      setBalance(res.data.wallet_balance.toFixed(2));
      setVehicles(res.data.vehicles);

      // Pre-select vehicle from search parameters or choose the first one
      const paramVehicleId = searchParams.get('vehicle_id');
      if (paramVehicleId) {
        setSelectedVehicleId(paramVehicleId);
      } else if (res.data.vehicles.length > 0) {
        setSelectedVehicleId(res.data.vehicles[0].vehicle_id.toString());
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/');
      }
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch recent toll transactions
  const fetchTollHistory = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    try {
      setLoadingHistory(true);
      const res = await axios.get('http://127.0.0.1:8000/transactions/?type_filter=TOLL', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentTolls(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchUserData();
    fetchTollHistory();
  }, [navigate]);

  // Adjust plaza and amount when plaza option changes
  useEffect(() => {
    if (selectedPlazaOption !== 'CUSTOM') {
      const plaza = predefinedPlazas.find(p => p.name === selectedPlazaOption);
      if (plaza) {
        setLocationState(plaza.state);
        setAmount(plaza.amount);
      }
    } else {
      setCustomPlazaName('');
      setLocationState('');
      setAmount('');
    }
  }, [selectedPlazaOption]);

  const handleQuickAmountSelect = (val) => {
    setAmount(val);
  };

  const selectedVehicle = vehicles.find(v => v.vehicle_id.toString() === selectedVehicleId);

  // Run toll simulation
  const handleSimulate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setResult(null);

    if (!selectedVehicleId) {
      setErrorMessage('Please select a vehicle to simulate.');
      return;
    }

    const finalPlazaName = selectedPlazaOption === 'CUSTOM' ? customPlazaName : selectedPlazaOption;
    if (!finalPlazaName || finalPlazaName.trim() === '') {
      setErrorMessage('Please specify the Toll Plaza name.');
      return;
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMessage('Please enter a valid amount greater than zero.');
      return;
    }

    if (numericAmount > 5000) {
      setErrorMessage('Toll amount exceeds realistic limits of ₹5,000.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
      setSimulating(true);
      // Operational simulation delay (RFID scanning simulation)
      await new Promise(resolve => setTimeout(resolve, 1200));

      const payload = {
        vehicle_id: parseInt(selectedVehicleId, 10),
        plaza_name: finalPlazaName,
        amount: numericAmount,
        location_state: locationState || null,
        remarks: remarks || null
      };

      const res = await axios.post('http://127.0.0.1:8000/wallet/simulate-toll-crossing', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setResult(res.data);
      if (res.data.success) {
        setToastMessage(`Toll crossed successfully! Deduction: ₹${numericAmount.toFixed(2)}`);
        // Update local wallet balance state
        setBalance(res.data.wallet_balance_after.toFixed(2));
      } else {
        setToastMessage(`Toll transaction failed: ${res.data.failure_reason}`);
      }

      // Refresh data and logs
      fetchUserData();
      fetchTollHistory();
    } catch (err) {
      console.error(err);
      if (err.response?.data?.detail) {
        setErrorMessage(err.response.data.detail);
      } else {
        setErrorMessage('Toll crossing simulation encountered an internal database or connection error.');
      }
    } finally {
      setSimulating(false);
    }
  };

  const getFailureReasonText = (reason) => {
    switch (reason) {
      case 'INSUFFICIENT_BALANCE':
        return 'Insufficient Wallet Balance';
      case 'FASTAG_DISABLED':
        return 'FASTag is Inactive or Disabled';
      case 'RC_UNVERIFIED':
        return 'RC Book Unverified / Pending';
      default:
        return reason || 'Declined';
    }
  };

  // Helper for status badge colors
  const getStatusBadge = (status) => {
    if (status === 'ACTIVE' || status === 'VERIFIED') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'INACTIVE') return 'bg-slate-100 text-slate-800 border-slate-200';
    if (status === 'REJECTED') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  // Estimated deduction preview calculation
  const currentVal = parseFloat(balance) || 0.00;
  const deductVal = parseFloat(amount) || 0.00;
  const estimatedRemaining = currentVal - deductVal;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col font-sans">
      <Topbar user={user} balance={balance} handleLogout={() => { localStorage.removeItem('access_token'); navigate('/'); }} onRechargeClick={() => setShowRechargeModal(true)} />

      {showRechargeModal && (
        <RechargeModal
          onClose={() => setShowRechargeModal(false)}
          onSuccess={(res) => {
            setToastMessage(`Recharge successful. New balance: ₹${res.new_balance}`);
            fetchUserData();
          }}
        />
      )}

      {toastMessage && (
        <div
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 border-l-4 border-l-[#00478F]"
          style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-xs font-bold text-slate-800 leading-none">Simulation Response</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">{toastMessage}</p>
          </div>
          <button onClick={() => setToastMessage('')} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-7 space-y-6">
        
        {/* Navigation header */}
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors border border-transparent hover:border-slate-200 bg-white">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none">Operations Simulator</p>
            <h1 className="text-xl font-bold text-slate-900 mt-1">FASTag Toll Crossing Console</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Input Form */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <div className="border-b border-slate-100 pb-4 mb-5">
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4 text-red-600" />
                  RFID Reader Ingestion Ingestion Panel
                </h2>
                <p className="text-xs text-slate-400 mt-1">Simulate real-time vehicle FASTag RFID readings at operational plazas.</p>
              </div>

              {errorMessage && (
                <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2.5 text-xs font-medium">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  {errorMessage}
                </div>
              )}

              <form onSubmit={handleSimulate} className="space-y-5">
                
                {/* 1. Vehicle selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Select Vehicle (Simulated RFID Tag)
                  </label>
                  {loadingData ? (
                    <div className="py-2 text-xs text-slate-400">Loading your fleet...</div>
                  ) : vehicles.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 rounded-lg text-center">
                      <p className="text-xs text-slate-500">No vehicles found in your account.</p>
                      <Link to="/dashboard" className="text-xs font-semibold text-[#00478F] underline mt-1 inline-block">
                        Register a vehicle first
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vehicles.map(v => {
                        const isSelected = selectedVehicleId === v.vehicle_id.toString();
                        return (
                          <div
                            key={v.vehicle_id}
                            onClick={() => setSelectedVehicleId(v.vehicle_id.toString())}
                            className={`border rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'border-[#00478F] bg-blue-50/20 ring-1 ring-[#00478F]/20'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-sm font-bold text-slate-800">{v.vehicle_number}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${getStatusBadge(v.fastag_status)}`}>
                                FASTag: {v.fastag_status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between mt-3 text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                              <span>{v.vehicle_class}</span>
                              <span className={`px-1.5 py-0.2 rounded ${getStatusBadge(v.rc_verification_status)}`}>
                                RC: {v.rc_verification_status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* 2. Toll plaza dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Toll Plaza Location
                    </label>
                    <select
                      value={selectedPlazaOption}
                      onChange={(e) => setSelectedPlazaOption(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#00478F]"
                    >
                      <option value="Krishnagiri Toll Plaza">Krishnagiri Toll Plaza (Tamil Nadu - ₹85)</option>
                      <option value="Walajah Toll Plaza">Walajah Toll Plaza (Tamil Nadu - ₹45)</option>
                      <option value="Chittor Toll Plaza">Chittor Toll Plaza (Andhra Pradesh - ₹120)</option>
                      <option value="CUSTOM">Other (Custom Manual Input)...</option>
                    </select>
                  </div>

                  {/* 3. Location state */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Location State
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tamil Nadu"
                      value={locationState}
                      disabled={selectedPlazaOption !== 'CUSTOM'}
                      onChange={(e) => setLocationState(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed focus:outline-none focus:border-[#00478F]"
                    />
                  </div>
                </div>

                {/* Custom Plaza input conditional */}
                {selectedPlazaOption === 'CUSTOM' && (
                  <div style={{ animation: 'toastIn 0.2s ease-out' }}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Custom Toll Plaza Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter custom plaza name..."
                      value={customPlazaName}
                      onChange={(e) => setCustomPlazaName(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#00478F]"
                    />
                  </div>
                )}

                {/* 4. Toll amount & quick selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Toll Fare (Amount)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-2 text-slate-400 text-sm font-semibold">₹</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        min="0.01"
                        step="0.01"
                        disabled={selectedPlazaOption !== 'CUSTOM'}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg pl-7 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#00478F] disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                    {selectedPlazaOption === 'CUSTOM' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {['45', '85', '120', '150'].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleQuickAmountSelect(val)}
                            className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                              amount === val
                                ? 'bg-[#00478F] border-[#00478F] text-white'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            ₹{val}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Optional Remarks */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Remarks / Operator Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lane 04 simulation"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:border-[#00478F]"
                  />
                </div>

                {/* Trigger simulation */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={simulating || vehicles.length === 0}
                    className="w-full py-3 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Transmitting RFID Data...
                      </>
                    ) : (
                      <>
                        <Activity className="w-4 h-4" />
                        Simulate Toll Barrier Crossing (Trigger Ingestion)
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Ledger & Results */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Ledger Pre-check/Estimate Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3.5">Balance Estimator</h3>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Current Wallet Balance:</span>
                  <span className="font-bold text-slate-700">₹{parseFloat(balance).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500 font-medium">
                  <span>Simulated Toll Cost:</span>
                  <span className="font-bold text-red-600">-₹{deductVal.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between font-semibold">
                  <span className="text-slate-800">Estimated Post-Deduction Balance:</span>
                  <span className={`font-bold text-sm ${estimatedRemaining < 100 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    ₹{estimatedRemaining.toFixed(2)}
                  </span>
                </div>

                {estimatedRemaining < 100 && estimatedRemaining >= 0 && (
                  <div className="mt-3.5 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-md flex items-start gap-2 text-[10px] leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    Warning: Simulated post-deduction balance triggers a low balance email & dashboard alert (threshold: ₹100).
                  </div>
                )}
                {estimatedRemaining < 0 && (
                  <div className="mt-3.5 bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md flex items-start gap-2 text-[10px] leading-relaxed">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    Simulation Alert: Negative balance will trigger a failed transaction with reason code INSUFFICIENT_BALANCE.
                  </div>
                )}
              </div>
            </div>

            {/* Simulated Toll Barrier Result Box */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm min-h-[220px] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Toll Gate Ingestion Log</h3>
                
                {simulating && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                    <RefreshCw className="w-7 h-7 text-[#00478F] animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Scanning RFID sticker... Reading vehicle details...</p>
                  </div>
                )}

                {!simulating && !result && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 border border-dashed border-slate-200 rounded-xl">
                    <Car className="w-6 h-6 text-slate-300" />
                    <p className="text-xs text-slate-400 max-w-[200px]">Simulate a toll crossing to verify barrier results in real-time.</p>
                  </div>
                )}

                {!simulating && result && (
                  <div className="space-y-4" style={{ animation: 'toastIn 0.3s ease-out' }}>
                    
                    {/* Opened barrier */}
                    {result.success ? (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Unlock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 leading-none">Barrier Opened</p>
                          <p className="text-[11px] text-emerald-600 mt-1.5 font-medium">Vehicle cleared. RFID verified.</p>
                          <p className="text-lg font-extrabold text-emerald-700 mt-1 leading-none">-₹{result.amount.toFixed(2)}</p>
                        </div>
                      </div>
                    ) : (
                      /* Closed barrier */
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold uppercase tracking-wider text-red-800 leading-none">Barrier Closed</p>
                          <p className="text-[11px] text-red-600 mt-1.5 font-semibold">
                            Reason: {getFailureReasonText(result.failure_reason)}
                          </p>
                          <p className="text-[11px] font-bold text-slate-700 mt-2">
                            Please pay manually at toll plaza.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 text-[11px] text-slate-500 font-medium pt-2 border-t border-slate-100">
                      <div className="flex justify-between">
                        <span>Plaza Name:</span>
                        <span className="font-bold text-slate-700">{result.plaza_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reference No:</span>
                        <span className="font-mono font-bold text-[#00478F]">{result.reference_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Timestamp:</span>
                        <span className="font-semibold">{result.timestamp}</span>
                      </div>
                      {result.success && (
                        <div className="flex justify-between border-t border-slate-50 pt-1">
                          <span>Updated Balance:</span>
                          <span className="font-bold text-slate-800">₹{result.wallet_balance_after.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-slate-400 mt-4 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                This interface is for internal operator simulation. Successful crossings log toll records and adjust balance; failed crossings register failures for administrator support audit.
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM SECTION: Recent Simulated Toll Events */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Simulated Toll Activity Log</h2>
              <p className="text-xs text-slate-400 mt-1">Audit log of simulated toll crossings and system decisions.</p>
            </div>
            <button
              onClick={fetchTollHistory}
              disabled={loadingHistory}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-50"
              title="Refresh History"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Timestamp</th>
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Reference No</th>
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Toll Plaza</th>
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Vehicle Number</th>
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="pb-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loadingHistory ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-xs font-semibold text-slate-400">
                      Loading history logs...
                    </td>
                  </tr>
                ) : recentTolls.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-xs font-semibold text-slate-400">
                      No simulated toll records found.
                    </td>
                  </tr>
                ) : (
                  recentTolls.map((toll, i) => {
                    const isSuccess = toll.status === 'SUCCESS';
                    return (
                      <tr key={toll.transaction_id || i} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 text-[11px] text-slate-400 font-medium">{toll.created_at}</td>
                        <td className="py-3.5 text-[11px] font-mono font-bold text-[#00478F]">{toll.reference_number}</td>
                        <td className="py-3.5">
                          <p className="text-xs font-bold text-slate-800 leading-none">{toll.plaza_name}</p>
                          <p className="text-[9px] text-slate-400 mt-1">FASTag RFID Reader Ingestion</p>
                        </td>
                        <td className="py-3.5 text-xs font-mono font-bold text-slate-600">{toll.vehicle_number}</td>
                        <td className="py-3.5 text-right font-extrabold text-xs text-slate-800">
                          -₹{toll.amount.toFixed(2)}
                        </td>
                        <td className="py-3.5 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${
                              isSuccess
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {toll.status}
                            </span>
                            {!isSuccess && toll.failure_reason && (
                              <span className="text-[9px] font-bold text-red-500 mt-1 uppercase">
                                {toll.failure_reason}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium">
        © 2026 GI Technology · Simulator Mode
      </footer>
    </div>
  );
}
