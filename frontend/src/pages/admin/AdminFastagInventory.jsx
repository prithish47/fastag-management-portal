import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Package, ChevronLeft, ChevronRight, Tag } from 'lucide-react';

const STATUS_BADGE = {
  UNASSIGNED:          'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  ASSIGNED:            'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  ACTIVE:              'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  DISABLED:            'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  BLACKLISTED:         'bg-red-50 text-red-700 ring-1 ring-red-200',
  REPLACED:            'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
  DAMAGED:             'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

function MetricCard({ label, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={`text-xl font-bold mt-1 ${color || 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function AdminFastagInventory({ onRowClick, refreshKey }) {
  const [tags, setTags] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vcFilter, setVcFilter] = useState('');
  const pageSize = 20;

  const fetchMetrics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const res = await axios.get('http://127.0.0.1:8000/admin/fastag-inventory/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', pageSize);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (vcFilter) params.append('vc_filter', vcFilter);

      const res = await axios.get(`http://127.0.0.1:8000/admin/fastag-inventory?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTags(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, vcFilter]);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);
  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { if (refreshKey) { fetchTags(); fetchMetrics(); } }, [refreshKey]);

  return (
    <div className="space-y-5">
      {/* Metrics Strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <MetricCard label="Total Tags" value={metrics.total_tags} />
          <MetricCard label="Unassigned" value={metrics.unassigned} color="text-emerald-600" />
          <MetricCard label="Assigned" value={metrics.assigned} color="text-blue-600" />
          <MetricCard label="Active" value={metrics.active} color="text-indigo-600" />
          <MetricCard label="Disabled" value={metrics.disabled} color="text-slate-500" />
          <MetricCard label="Blacklisted" value={metrics.blacklisted} color="text-red-600" />
          <MetricCard label="Damaged" value={metrics.damaged} color="text-amber-600" />
        </div>
      )}

      {/* Vehicle Class Distribution */}
      {metrics && metrics.by_vehicle_class && Object.keys(metrics.by_vehicle_class).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Vehicle Class Distribution</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Object.entries(metrics.by_vehicle_class).map(([vc, data]) => (
              <div key={vc} className="border border-slate-200 rounded-lg px-3 py-2.5">
                <p className="text-xs font-bold text-slate-900">{vc}</p>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1.5">
                  <span className="text-[10px] font-semibold text-emerald-600">{data.unassigned} unasg</span>
                  <span className="text-[10px] font-semibold text-blue-600">{data.assigned} asgn</span>
                  <span className="text-[10px] font-semibold text-indigo-600">{data.active} actv</span>
                  <span className="text-[10px] font-semibold text-red-500">{data.blacklisted} blk</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">FASTag Inventory</h3>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search FASTag ID..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] w-44"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="UNASSIGNED">Unassigned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
              <option value="BLACKLISTED">Blacklisted</option>
              <option value="REPLACED">Replaced</option>
              <option value="DAMAGED">Damaged</option>
            </select>
            <select
              value={vcFilter}
              onChange={(e) => { setVcFilter(e.target.value); setPage(1); }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none"
            >
              <option value="">All Classes</option>
              <option value="VC4">VC4</option>
              <option value="VC5">VC5</option>
              <option value="VC6">VC6</option>
              <option value="VC7">VC7</option>
              <option value="VC12">VC12</option>
              <option value="VC16">VC16</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">FASTag ID</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Serial</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Class</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned To</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issued</th>
                <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">Loading inventory…</td></tr>
              ) : tags.length === 0 ? (
                <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400 font-medium">No tags found</td></tr>
              ) : (
                tags.map(tag => (
                  <tr key={tag.id} onClick={() => onRowClick?.(tag.id)} className={`hover:bg-slate-50/50 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-mono font-bold text-slate-900">{tag.fastag_id}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-mono text-slate-500">{tag.tag_serial_number}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{tag.vehicle_class}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${STATUS_BADGE[tag.status] || STATUS_BADGE.INACTIVE}`}>
                        {tag.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {tag.assigned_vehicle_number ? (
                        <span className="text-xs font-mono font-semibold text-[#00478F]">{tag.assigned_vehicle_number}</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-500 font-medium">{tag.issued_at || '—'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] text-slate-500 font-medium">{tag.activated_at || '—'}</span>
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
    </div>
  );
}
