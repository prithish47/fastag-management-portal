import React, { useState } from 'react';
import axios from 'axios';
import { X, CreditCard, Wallet, Smartphone, Loader2 } from 'lucide-react';
import { useWallet } from '../context/WalletContext';

export default function RechargeModal({ onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [processing, setProcessing] = useState(false);
  const { fetchBalance } = useWallet();

  const handlePreset = (val) => {
    setAmount(val.toString());
  };

  const handleRecharge = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) return;

    setProcessing(true);

    try {
      const token = localStorage.getItem('access_token');
      const res = await axios.post(
        'http://127.0.0.1:8000/wallet/recharge',
        {
          amount: Number(amount),
          payment_method: method,
          vehicle_id: null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Update wallet globally
      await fetchBalance();
      
      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div 
        className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden"
        style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Wallet Recharge</h2>
          <button onClick={onClose} disabled={processing} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleRecharge} className="p-5 space-y-5">
          {/* Amount Section */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Recharge Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:border-[#00478F] focus:ring-1 focus:ring-[#00478F] outline-none transition-all"
                disabled={processing}
                required
                min="1"
              />
            </div>
            
            {/* Preset Chips */}
            <div className="flex items-center gap-2 mt-3">
              {[200, 500, 1000, 2000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePreset(val)}
                  disabled={processing}
                  className="flex-1 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded text-[11px] font-semibold text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors"
                >
                  +₹{val}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Payment Method
            </label>
            <div className="space-y-2">
              {[
                { id: 'UPI', icon: Smartphone, label: 'UPI (GPay, PhonePe)' },
                { id: 'Debit Card', icon: CreditCard, label: 'Debit / Credit Card' },
                { id: 'Net Banking', icon: Wallet, label: 'Net Banking' },
              ].map(opt => (
                <label 
                  key={opt.id} 
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    method === opt.id ? 'border-[#00478F] bg-blue-50/30' : 'border-slate-200 hover:bg-slate-50'
                  } ${processing ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  <input 
                    type="radio" 
                    name="method" 
                    value={opt.id} 
                    checked={method === opt.id} 
                    onChange={() => setMethod(opt.id)} 
                    className="w-4 h-4 text-[#00478F] focus:ring-[#00478F]"
                  />
                  <opt.icon className={`w-4 h-4 ${method === opt.id ? 'text-[#00478F]' : 'text-slate-400'}`} />
                  <span className={`text-sm font-medium ${method === opt.id ? 'text-[#00478F]' : 'text-slate-700'}`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={processing || !amount}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00478F] text-white text-sm font-semibold rounded-lg hover:bg-[#003a75] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2 shadow-sm"
          >
            {processing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              'Proceed Recharge'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
