import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, CheckCircle, Clock, AlertTriangle, CreditCard, Receipt, MoreVertical, RefreshCw, CheckCircle2, X as CloseIcon } from 'lucide-react';
import axios from 'axios';
import usePageTitle from '../hooks/usePageTitle';
import { useWallet } from '../context/WalletContext';
import RechargeModal from '../components/RechargeModal';

export default function VehicleDetails() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const { fetchBalance } = useWallet();
  const [vehicle, setVehicle] = useState(null);
  const [activities, setActivities] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  usePageTitle(showRechargeModal ? "Recharge Wallet" : (vehicle ? `${vehicle.vehicle_number} • Vehicle Details` : "Vehicle Details"));
  const [showDropdown, setShowDropdown] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState(null);
  
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const showToast = (message) => {
    setToast(message);
  };

  const fetchVehicleDetails = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const [detailsRes, transRes] = await Promise.all([
        axios.get(`http://localhost:8000/vehicles/${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`http://localhost:8000/transactions/?vehicle_id=${vehicleId}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setVehicle(detailsRes.data.vehicle);
      setActivities(detailsRes.data.activities);
      setTransactions(transRes.data);
    } catch (error) {
      showToast('Failed to load vehicle details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.patch(`http://localhost:8000/vehicles/${vehicleId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      showToast(`Status updated to ${newStatus.replace('_', ' ')}`);
      fetchVehicleDetails();
    } catch (err) {
      showToast('Failed to update status');
    } finally {
      setShowDropdown(false);
    }
  };

  const handleStatusClick = (status) => {
    if (status === 'DISABLED') {
      setConfirmAction({ status, title: 'Disable FASTag', message: 'Are you sure you want to disable this FASTag? Toll payments will fail.' });
    } else if (status === 'PENDING_REPLACEMENT') {
      setConfirmAction({ status, title: 'Replace FASTag', message: 'Are you sure you want to mark this FASTag for replacement?' });
    } else {
      updateStatus(status);
    }
    setShowDropdown(false);
  };

  useEffect(() => {
    fetchVehicleDetails();
  }, [vehicleId]);

  const handleFrontUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File exceeds 10MB limit");
      return;
    }

    setUploadingFront(true);
    const formData = new FormData();
    formData.append('rc_front_file', file);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `http://localhost:8000/vehicles/${vehicleId}/rc-reupload/front`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      showToast(response.data.message);
      fetchVehicleDetails(); // refresh details and timeline
    } catch (error) {
      showToast('Failed to reupload RC Front document');
    } finally {
      setUploadingFront(false);
      if (frontInputRef.current) {
        frontInputRef.current.value = "";
      }
    }
  };

  const handleBackUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File exceeds 10MB limit");
      return;
    }

    setUploadingBack(true);
    const formData = new FormData();
    formData.append('rc_back_file', file);

    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(
        `http://localhost:8000/vehicles/${vehicleId}/rc-reupload/back`,
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      showToast(response.data.message);
      fetchVehicleDetails(); // refresh details and timeline
    } catch (error) {
      showToast('Failed to reupload RC Back document');
    } finally {
      setUploadingBack(false);
      if (backInputRef.current) {
        backInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00478F]"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8 text-center text-slate-500">
        Vehicle not found. <Link to="/dashboard" className="text-[#00478F] underline">Return to Dashboard</Link>
      </div>
    );
  }

  // Helper for status badge colors
  const getStatusBadge = (status) => {
    if (status === 'ACTIVE' || status === 'VERIFIED') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (status === 'PENDING') return 'bg-amber-100 text-amber-800 border-amber-200';
    if (status === 'INACTIVE') return 'bg-slate-100 text-slate-800 border-slate-200';
    if (status === 'REJECTED') return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* ─── TOP HEADER STRIP ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{vehicle.vehicle_number}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getStatusBadge(vehicle.fastag_status)}`}>
                FASTag: {vehicle.fastag_status}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getStatusBadge(vehicle.rc_verification_status)}`}>
                RC: {vehicle.rc_verification_status}
              </span>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium border border-slate-200">
                {vehicle.vehicle_class} • {vehicle.vehicle_type || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <button onClick={() => setShowRechargeModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-colors shadow-sm">
            <CreditCard className="w-4 h-4" />
            Recharge
          </button>
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setShowDropdown(!showDropdown)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors shadow-sm focus:outline-none">
              <MoreVertical className="w-5 h-5" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50">
                <button onClick={() => { setShowRechargeModal(true); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00478F] transition-colors">
                  Recharge FASTag
                </button>
                <button onClick={() => handleStatusClick('ACTIVE')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors">
                  Enable FASTag
                </button>
                <button onClick={() => handleStatusClick('DISABLED')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors">
                  Disable FASTag
                </button>
                <button onClick={() => handleStatusClick('PENDING_REPLACEMENT')} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-amber-600 transition-colors border-b border-slate-100">
                  Replace FASTag
                </button>
                <button onClick={() => { navigate(`/simulate-toll-crossing?vehicle_id=${vehicleId}`); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-55/80 transition-colors border-b border-slate-100">
                  Simulate Toll Crossing
                </button>
                <button onClick={() => { navigate('/transactions'); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00478F] transition-colors">
                  View Transactions
                </button>
                <button onClick={() => { showToast('Statement downloaded (Mock)'); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00478F] transition-colors">
                  Download Statement
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ─── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* VEHICLE INFO */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Technical Details</h2>
            </div>
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Engine Number</label>
                <div className="mt-1 text-sm font-medium text-slate-900">{vehicle.engine_number}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Chassis Number</label>
                <div className="mt-1 text-sm font-medium text-slate-900">{vehicle.chassis_number}</div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Added On</label>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {new Date(vehicle.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Updated</label>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {new Date(vehicle.updated_at || vehicle.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* RC DOCUMENTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* RC Front Page */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">RC Front Page</h2>
                <button 
                  onClick={() => frontInputRef.current?.click()}
                  disabled={uploadingFront}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#00478F] hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  {uploadingFront ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {vehicle.rc_front_path ? 'Re-upload' : 'Upload'}
                </button>
                <input 
                  type="file" 
                  ref={frontInputRef} 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={handleFrontUpload} 
                />
              </div>
              <div className="p-4">
                {vehicle.rc_front_path ? (
                  <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-[#00478F] rounded flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        RC_Front_Page
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Ready for review
                      </p>
                    </div>
                    <div>
                      <a 
                        href={`http://localhost:8000/vehicles/download/rc/${vehicleId}/front?token=${localStorage.getItem('access_token')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-white bg-[#00478F] px-2.5 py-1 rounded hover:bg-blue-800 transition-colors inline-block"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ) : vehicle.rc_verification_status === 'VERIFIED' ? (
                  <div className="text-center py-5 px-3 border border-dashed border-emerald-200 bg-emerald-50/20 rounded-lg flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Verified
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">RC document has been verified by an administrator.</p>
                  </div>
                ) : (
                  <div className="text-center py-5 px-3 border border-dashed border-red-200 bg-red-50/20 rounded-lg flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      Upload Required
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Please upload the Front side of your RC book.</p>
                  </div>
                )}
              </div>
            </div>

            {/* RC Back Page */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">RC Back Page</h2>
                <button 
                  onClick={() => backInputRef.current?.click()}
                  disabled={uploadingBack}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#00478F] hover:text-blue-800 transition-colors disabled:opacity-50"
                >
                  {uploadingBack ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {vehicle.rc_back_path ? 'Re-upload' : 'Upload'}
                </button>
                <input 
                  type="file" 
                  ref={backInputRef} 
                  className="hidden" 
                  accept=".jpg,.jpeg,.png,.pdf" 
                  onChange={handleBackUpload} 
                />
              </div>
              <div className="p-4">
                {vehicle.rc_back_path ? (
                  <div className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-[#00478F] rounded flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        RC_Back_Page
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Ready for review
                      </p>
                    </div>
                    <div>
                      <a 
                        href={`http://localhost:8000/vehicles/download/rc/${vehicleId}/back?token=${localStorage.getItem('access_token')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-white bg-[#00478F] px-2.5 py-1 rounded hover:bg-blue-800 transition-colors inline-block"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ) : vehicle.rc_verification_status === 'VERIFIED' ? (
                  <div className="text-center py-5 px-3 border border-dashed border-emerald-200 bg-emerald-50/20 rounded-lg flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Verified
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">RC document has been verified by an administrator.</p>
                  </div>
                ) : (
                  <div className="text-center py-5 px-3 border border-dashed border-red-200 bg-red-50/20 rounded-lg flex flex-col items-center">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-800 border border-red-200">
                      Upload Required
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">Please upload the Back side of your RC book.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
          
          {/* RECENT TRANSACTIONS */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-6">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Recent Transactions</h2>
              <button onClick={() => navigate('/transactions')} className="text-xs font-semibold text-[#00478F] hover:text-blue-800 transition-colors">
                View Full History
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Description</th>
                    <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                    <th className="py-3 px-5 text-[10px] font-semibold text-slate-400 uppercase tracking-widest text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-8 text-center text-xs font-medium text-slate-400">
                        No transactions recorded for this vehicle.
                      </td>
                    </tr>
                  ) : (
                    transactions.slice(0, 5).map((txn, i) => {
                      const isRecharge = txn.transaction_type === 'WALLET_RECHARGE';
                      return (
                        <tr key={txn.transaction_id || i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-5 text-[11px] text-slate-500 font-medium whitespace-nowrap">{txn.created_at}</td>
                          <td className="py-3 px-5">
                            <p className="text-sm font-semibold text-slate-800 leading-none">{txn.plaza_name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{isRecharge ? 'Wallet Recharge' : 'Toll Deduction'}</p>
                          </td>
                          <td className={`py-3 px-5 text-sm font-bold text-right whitespace-nowrap ${isRecharge ? 'text-emerald-600' : 'text-slate-800'}`}>
                            {isRecharge ? '+' : '-'}₹{txn.amount.toFixed(2)}
                          </td>
                          <td className="py-3 px-5 text-right">
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

        {/* ─── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* LAST TOLL ACTIVITY */}
          {(() => {
            const lastToll = transactions.find(t => t.transaction_type === 'TOLL_DEDUCTION');
            if (!lastToll) return null;
            const isSuccess = lastToll.status === 'SUCCESS';
            return (
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Last Toll Activity</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${
                    isSuccess ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {isSuccess ? 'Success' : `Failed: ${lastToll.failure_reason || 'Rejected'}`}
                  </span>
                </div>
                <div className="p-5 space-y-3">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Toll Plaza</span>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{lastToll.plaza_name}</p>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Amount</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">₹{lastToll.amount.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Timestamp</span>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{lastToll.created_at}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ACTIVITY TIMELINE */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Activity Log</h2>
            </div>
            <div className="p-5">
              {activities.length > 0 ? (
                <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                  {activities.map((activity, idx) => (
                    <div key={activity.log_id || idx} className="relative pl-6">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-[#00478F]"></div>
                      <div className="text-xs font-semibold text-slate-500 mb-0.5">
                        {new Date(activity.created_at).toLocaleString()}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">
                        {activity.activity_type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        {activity.activity_message}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-sm text-slate-500 py-4">
                  No operational activities recorded yet.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      {showRechargeModal && (
        <RechargeModal 
          onClose={() => setShowRechargeModal(false)}
          onSuccess={(res) => {
            showToast(`Recharge successful: ₹${res.new_balance}`);
            fetchVehicleDetails(); // refresh timeline
          }}
        />
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden" style={{ animation: 'toastIn 0.3s ease-out' }}>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">{confirmAction.title}</h3>
              <button onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-slate-600">
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">{confirmAction.message}</p>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md transition-colors">
                Cancel
              </button>
              <button onClick={() => { updateStatus(confirmAction.status); setConfirmAction(null); }} className="px-4 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors">
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3 border-l-4 border-l-[#00478F]"
          style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="min-w-[180px]">
            <p className="text-xs font-bold text-slate-800 leading-none">System Notification</p>
            <p className="text-[11px] text-slate-500 mt-1 leading-normal">{toast}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
            <CloseIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(12px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}
