import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Users, ChevronLeft, ChevronRight, ChevronRight as OpenIcon } from 'lucide-react';

const STATUS_BADGE = {
  ACTIVE:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  SUSPENDED: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  DISABLED:  'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const ROLE_BADGE = {
  USER:  'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  ADMIN: 'bg-blue-50 text-[#00478F] ring-1 ring-blue-200',
};

export default function AdminUsersTable({ onRowClick, refreshKey }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const pageSize = 15;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status_filter', statusFilter);

      const res = await axios.get(`http://127.0.0.1:8000/admin/users?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  // Refetch when parent signals a refresh
  useEffect(() => { if (refreshKey) fetchUsers(); }, [refreshKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">User Management</h3>
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] w-48"
              />
            </div>
          </form>
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-[#00478F]/20"
          >
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DISABLED">Disabled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Wallet</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Vehicles</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Role</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">Loading users…</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">No users found</td></tr>
            ) : (
              users.map(u => (
                <tr
                  key={u.user_id}
                  onClick={() => onRowClick?.(u.user_id)}
                  className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
                        {u.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 leading-none">{u.full_name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{u.created_at || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-xs text-slate-700 font-medium truncate max-w-[160px]">{u.email}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{u.mobile_number}</p>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-bold text-slate-900">₹{u.wallet_balance.toFixed(2)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm font-semibold text-slate-700">{u.vehicle_count}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${ROLE_BADGE[u.role] || ROLE_BADGE.USER}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[u.account_status] || STATUS_BADGE.ACTIVE}`}>
                      {u.account_status}
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
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
