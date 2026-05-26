import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Car, ChevronLeft, ChevronRight, ChevronRight as OpenIcon } from 'lucide-react';

const FASTAG_BADGE = {
  ACTIVE:              'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  INACTIVE:            'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  DISABLED:            'bg-red-50 text-red-600 ring-1 ring-red-200',
  PENDING_REPLACEMENT: 'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
};

const RC_BADGE = {
  VERIFIED: 'bg-blue-50 text-blue-600 ring-1 ring-blue-200',
  PENDING:  'bg-amber-50 text-amber-600 ring-1 ring-amber-200',
  REJECTED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
};

export default function AdminVehiclesTable({ onRowClick, refreshKey }) {
  const [vehicles, setVehicles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [fastagFilter, setFastagFilter] = useState('');
  const [rcFilter, setRcFilter] = useState('');
  const pageSize = 15;

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      if (search) params.append('search', search);
      if (fastagFilter) params.append('fastag_filter', fastagFilter);
      if (rcFilter) params.append('rc_filter', rcFilter);

      const res = await axios.get(`http://127.0.0.1:8000/admin/vehicles?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setVehicles(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, fastagFilter, rcFilter]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);
  useEffect(() => { if (refreshKey) fetchVehicles(); }, [refreshKey]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vehicle Management</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search vehicles..."
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] w-44"
            />
          </div>
          <select
            value={fastagFilter}
            onChange={(e) => { setFastagFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          >
            <option value="">All FASTag</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DISABLED">Disabled</option>
          </select>
          <select
            value={rcFilter}
            onChange={(e) => { setRcFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
          >
            <option value="">All RC</option>
            <option value="PENDING">Pending</option>
            <option value="VERIFIED">Verified</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Owner</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">FASTag</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">RC Status</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Activity</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Wallet</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">Loading vehicles…</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">No vehicles found</td></tr>
            ) : (
              vehicles.map(v => (
                <tr
                  key={v.vehicle_id}
                  onClick={() => onRowClick?.(v.vehicle_id)}
                  className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-3 px-4">
                    <p className="text-sm font-bold text-slate-900 font-mono leading-none">{v.vehicle_number}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{v.vehicle_type || 'Vehicle'} · {v.vehicle_class}</p>
                    {v.fastag_id && <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Tag: {v.fastag_id}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-xs font-semibold text-slate-700">{v.owner_name}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{v.owner_email}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${FASTAG_BADGE[v.fastag_status] || FASTAG_BADGE.INACTIVE}`}>
                      {(v.fastag_status || 'INACTIVE').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${RC_BADGE[v.rc_verification_status] || RC_BADGE.PENDING}`}>
                      {v.rc_verification_status || 'PENDING'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[11px] text-slate-500 font-medium">{v.last_activity || '—'}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`text-xs font-semibold ${v.wallet_sufficient ? 'text-emerald-600' : 'text-red-600'}`}>
                      ₹{v.wallet_balance.toFixed(0)}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {onRowClick && <OpenIcon className="w-3.5 h-3.5 text-slate-300" />}
                  </td>
                </tr>
              ))
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
