import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { HelpCircle, Search, Filter, ChevronLeft, ChevronRight, MessageSquare, Clock } from 'lucide-react';
import AdminSupportDrawer from '../../components/admin/AdminSupportDrawer';

const API = 'http://127.0.0.1:8000/admin';
const token = () => sessionStorage.getItem('admin_access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_BADGE = {
  OPEN: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'FASTAG_ISSUE', label: 'FASTag Issue' },
  { value: 'RC_VERIFICATION', label: 'RC Verification' },
  { value: 'WALLET_ISSUE', label: 'Wallet Issue' },
  { value: 'TOLL_DEDUCTION', label: 'Toll Deduction' },
  { value: 'REPLACEMENT_REQUEST', label: 'Replacement Request' },
  { value: 'ACCOUNT_ISSUE', label: 'Account Issue' },
  { value: 'OTHER', label: 'Other' },
];

function formatTimeAgo(isoString) {
  if (!isoString) return '—';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function AdminSupportTable({ onRowClick, refreshKey }) {
  const [data, setData] = useState({ items: [], total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  
  const [filters, setFilters] = useState({
    status: '',
    category: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        page_size: 15,
      });
      if (search) params.append('search', search);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);

      const res = await axios.get(`${API}/support/tickets?${params.toString()}`, { headers: headers() });
      setData(res.data);
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) window.location.href = '/admin-login';
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Handle Search Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search ticket ID, vehicle, email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F]"
          />
        </form>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 ml-1" />
          <select
            value={filters.status}
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] bg-white text-slate-600 font-medium"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
            className="pl-3 pr-8 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] bg-white text-slate-600 font-medium max-w-[140px]"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Ticket #</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest min-w-[200px]">Subject & User</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Last Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && data.items.length === 0 ? (
                <tr><td colSpan="6" className="py-8 text-center text-xs text-slate-400 font-medium">Loading tickets...</td></tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-600">No tickets found</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or search.</p>
                  </td>
                </tr>
              ) : (
                data.items.map(t => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => onRowClick(t.ticket_id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <span className="text-xs font-bold text-slate-700 font-mono">#{t.ticket_id}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[250px]">{t.subject}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-medium text-[#00478F]">{t.user_name}</span>
                        <span className="text-[10px] text-slate-400">• {t.user_email}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">{t.category.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-slate-600 font-mono uppercase">{t.vehicle_number || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_BADGE[t.status] || ''}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-semibold text-slate-600">{formatTimeAgo(t.last_message_at)}</span>
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-slate-400 font-medium">
                          <MessageSquare className="w-2.5 h-2.5" />
                          {t.message_count} msgs
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Showing <span className="text-slate-800">{(page - 1) * 15 + (data.items.length > 0 ? 1 : 0)}</span> to <span className="text-slate-800">{(page - 1) * 15 + data.items.length}</span> of <span className="text-slate-800">{data.total}</span>
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.min(data.total_pages, p + 1))}
              disabled={page >= data.total_pages}
              className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
