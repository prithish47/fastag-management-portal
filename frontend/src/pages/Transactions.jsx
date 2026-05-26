import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import { ArrowLeft, Filter, Download, ArrowUpRight, ArrowDownRight, Clock, FileText } from 'lucide-react';

export default function Transactions() {
  usePageTitle('Transactions');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [filter, setFilter] = useState('ALL'); // ALL, RECHARGE, TOLL

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      let url = 'http://127.0.0.1:8000/transactions/';
      if (filter !== 'ALL') {
        url += `?type_filter=${filter}`;
      }
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setDownloading(true);
    try {
      const token = localStorage.getItem('access_token');
      let url = 'http://127.0.0.1:8000/transactions/export/pdf';
      if (filter !== 'ALL') {
        url += `?type_filter=${filter}`;
      }
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Account_Statement_${filter}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error(err);
      alert('Failed to export PDF');
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const getStatusBadge = (status) => {
    if (status === 'SUCCESS') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
    if (status === 'FAILED') return 'bg-red-50 text-red-700 ring-1 ring-red-200';
    if (status === 'PENDING') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
    return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account Statement</h1>
            <p className="text-xs text-slate-500 mt-0.5">View your recharge history and toll deductions</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportPDF} disabled={downloading} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 text-sm font-semibold rounded-md hover:bg-slate-100 transition-colors disabled:opacity-50">
            <Download className={`w-4 h-4 ${downloading ? 'animate-pulse' : ''}`} />
            {downloading ? 'Exporting...' : 'Export PDF'}
          </button>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        
        {/* FILTERS */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filter:</span>
          </div>
          <div className="flex bg-white rounded-lg border border-slate-200 p-1">
            {['ALL', 'RECHARGE', 'TOLL'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  filter === f ? 'bg-[#00478F] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-white">
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Date</th>
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Reference</th>
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</th>
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Payment Method</th>
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Amount</th>
                <th className="py-3 px-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-sm font-medium text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-5 h-5 animate-pulse" />
                      Loading transactions...
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <FileText className="w-8 h-8 opacity-50" />
                      <span className="text-sm font-medium text-slate-500">No transactions found for this filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isRecharge = txn.transaction_type === 'WALLET_RECHARGE';
                  return (
                    <tr key={txn.transaction_id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-5 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                        {txn.created_at}
                      </td>
                      <td className="py-4 px-5">
                        <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                          {txn.reference_number || `TXN${txn.transaction_id.toString().padStart(6, '0')}`}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${isRecharge ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {isRecharge ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{txn.plaza_name}</p>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                              {txn.vehicle_number !== '—' ? `Vehicle: ${txn.vehicle_number}` : 'Wallet Operation'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-xs font-semibold text-slate-600">
                        {txn.payment_method}
                      </td>
                      <td className={`py-4 px-5 text-sm font-bold text-right whitespace-nowrap ${isRecharge ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {isRecharge ? '+' : '-'}₹{txn.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${getStatusBadge(txn.status)}`}>
                          {txn.status}
                        </span>
                        {txn.status === 'FAILED' && txn.failure_reason && (
                          <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wide">
                            {txn.failure_reason.replace('_', ' ')}
                          </p>
                        )}
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
  );
}
