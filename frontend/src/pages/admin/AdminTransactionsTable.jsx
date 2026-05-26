import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, FileText, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const STATUS_BADGE = {
  SUCCESS: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  FAILED:  'bg-red-50 text-red-700 ring-1 ring-red-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

export default function AdminTransactionsTable() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const pageSize = 20;

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      if (search) params.append('search', search);
      if (typeFilter) params.append('type_filter', typeFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await axios.get(`http://127.0.0.1:8000/admin/transactions?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transaction Monitoring</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Reference, user..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] w-40"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="WALLET_RECHARGE">Recharge</option>
            <option value="TOLL_DEDUCTION">Toll</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reference</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Method</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="8" className="py-10 text-center text-sm text-slate-400 font-medium">Loading transactions…</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="8" className="py-10 text-center text-sm text-slate-400 font-medium">No transactions found</td></tr>
            ) : (
              transactions.map(txn => {
                const isRecharge = txn.transaction_type === 'WALLET_RECHARGE';
                return (
                  <tr key={txn.transaction_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                        {txn.reference_number || `TXN${txn.transaction_id.toString().padStart(6, '0')}`}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-slate-800">{txn.user_name}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{txn.user_email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-mono text-slate-600">{txn.vehicle_number}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`p-1 rounded-full ${isRecharge ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {isRecharge ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        </div>
                        <div className="text-left">
                          <span className="text-[11px] font-semibold text-slate-700 block">
                            {isRecharge ? 'Recharge' : 'Toll Ingestion'}
                          </span>
                          {!isRecharge && txn.plaza_name && (
                            <span className="text-[9px] text-slate-400 font-medium block leading-none mt-0.5">
                              {txn.plaza_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-sm font-bold text-right whitespace-nowrap ${isRecharge ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {isRecharge ? '+' : '-'}₹{txn.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[txn.status] || 'bg-slate-100 text-slate-500'}`}>
                        {txn.status}
                      </span>
                      {txn.status === 'FAILED' && txn.failure_reason && (
                        <p className="text-[9px] font-bold text-red-500 mt-1 uppercase tracking-wide">
                          {txn.failure_reason.replace('_', ' ')}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs text-slate-600 font-medium">{txn.payment_method || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{txn.created_at}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 font-medium">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
