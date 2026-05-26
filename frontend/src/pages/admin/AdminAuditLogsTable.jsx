import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  Search, History, ChevronLeft, ChevronRight, X, Shield, Globe, Clock, Laptop, RefreshCw
} from 'lucide-react';

const ROLE_BADGE = {
  USER: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  ADMIN: 'bg-blue-50 text-[#00478F] ring-1 ring-blue-200',
  SYSTEM: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
};

const ACTION_COLOR = {
  USER_REGISTER: 'text-blue-700 bg-blue-50 border-blue-100',
  USER_LOGIN: 'text-indigo-700 bg-indigo-50 border-indigo-100',
  ADMIN_LOGIN: 'text-violet-700 bg-violet-50 border-violet-100',
  VEHICLE_ADD: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  RC_FRONT_UPLOAD: 'text-cyan-700 bg-cyan-50 border-cyan-100',
  RC_BACK_UPLOAD: 'text-teal-700 bg-teal-50 border-teal-100',
  WALLET_RECHARGE: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  LOW_BALANCE_SETTINGS_UPDATE: 'text-amber-700 bg-amber-50 border-amber-100',
  RC_FRONT_CLEARED_BY_ADMIN: 'text-rose-700 bg-rose-50 border-rose-100',
  RC_BACK_CLEARED_BY_ADMIN: 'text-rose-700 bg-rose-50 border-rose-100',
  RC_VERIFICATION_STATUS_UPDATE: 'text-orange-700 bg-orange-50 border-orange-100',
  FASTAG_STATUS_UPDATE: 'text-amber-700 bg-amber-50 border-amber-100',
  USER_STATUS_UPDATE: 'text-amber-700 bg-amber-50 border-amber-100',
  FASTAG_AUTO_ASSIGN: 'text-purple-700 bg-purple-50 border-purple-100',
};

// Formats timestamp nicely
function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function InfoRow({ icon: Icon, label, value, mono, badge, badgeClass }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mt-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-400" />}
        {label}
      </div>
      {badge ? (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>{value}</span>
      ) : (
        <span className={`text-xs font-semibold text-slate-800 text-right max-w-[300px] break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      )}
    </div>
  );
}

export default function AdminAuditLogsTable({ refreshKey }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  // Selected Log for Drawer
  const [selectedLog, setSelectedLog] = useState(null);

  const pageSize = 15;

  const fetchLogs = useCallback(async (targetPage = page) => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const params = new URLSearchParams();
      params.append('page', targetPage);
      params.append('limit', pageSize);
      if (search) params.append('search', search);
      if (roleFilter) params.append('actor_role', roleFilter);
      if (entityFilter) params.append('entity_type', entityFilter);

      const res = await axios.get(`http://127.0.0.1:8000/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.items);
      setTotal(res.data.total);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, entityFilter, page]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, roleFilter, entityFilter, fetchLogs]);

  useEffect(() => {
    if (refreshKey) {
      fetchLogs(page);
    }
  }, [refreshKey, fetchLogs, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const renderDiff = (oldValues, newValues) => {
    if (!oldValues && !newValues) {
      return (
        <div className="py-6 text-center text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">
          No state changes recorded.
        </div>
      );
    }

    const oldObj = typeof oldValues === 'object' && oldValues !== null ? oldValues : {};
    const newObj = typeof newValues === 'object' && newValues !== null ? newValues : {};
    const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

    // Filter to keys that actually changed
    const changedKeys = allKeys.filter(key => JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]));

    if (changedKeys.length === 0) {
      return (
        <div className="py-6 text-center text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">
          No difference detected in field values.
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[320px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Field</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Before</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {changedKeys.map(key => {
                  const beforeVal = oldObj[key];
                  const afterVal = newObj[key];
                  return (
                    <tr key={key} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-mono text-[11px] text-slate-600 font-bold">{key}</td>
                      <td className="py-2 px-3 text-red-700 bg-red-50/20 font-mono text-[10px] max-w-[150px] truncate" title={JSON.stringify(beforeVal)}>
                        {beforeVal !== undefined ? (typeof beforeVal === 'object' ? JSON.stringify(beforeVal) : String(beforeVal)) : <span className="text-slate-300 italic">none</span>}
                      </td>
                      <td className="py-2 px-3 text-emerald-700 bg-emerald-50/20 font-mono text-[10px] max-w-[150px] truncate" title={JSON.stringify(afterVal)}>
                        {afterVal !== undefined ? (typeof afterVal === 'object' ? JSON.stringify(afterVal) : String(afterVal)) : <span className="text-slate-300 italic">none</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Full JSON Dump option */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {oldValues && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Original State (JSON)</p>
              <pre className="bg-slate-50 border border-slate-200 text-[10px] p-3 rounded-lg font-mono overflow-auto max-h-48 text-slate-600 leading-relaxed">
                {JSON.stringify(oldValues, null, 2)}
              </pre>
            </div>
          )}
          {newValues && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Updated State (JSON)</p>
              <pre className="bg-slate-50 border border-slate-200 text-[10px] p-3 rounded-lg font-mono overflow-auto max-h-48 text-slate-600 leading-relaxed">
                {JSON.stringify(newValues, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      {/* Header & Filters */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Audit Logs</h3>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{total}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="flex">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search actor, action, IP..."
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] w-48"
              />
            </div>
          </form>

          {/* Actor Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => handleFilterChange(setRoleFilter, e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-[#00478F]/20"
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
            <option value="SYSTEM">System</option>
          </select>

          {/* Entity Type Filter */}
          <select
            value={entityFilter}
            onChange={(e) => handleFilterChange(setEntityFilter, e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 font-medium focus:outline-none focus:ring-2 focus:ring-[#00478F]/20"
          >
            <option value="">All Entities</option>
            <option value="User">User</option>
            <option value="Vehicle">Vehicle</option>
            <option value="Wallet">Wallet</option>
            <option value="AlertSettings">Alert Settings</option>
            <option value="FastagInventory">FASTag Inventory</option>
          </select>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchLogs(page)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
            title="Refresh Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[900px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50">
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-40">Timestamp</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-48">Actor</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-56">Action</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-44">Target Entity</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-36">IP Address</th>
              <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User Agent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-xs text-slate-400 font-semibold">
                  Loading system audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-xs text-slate-400 font-semibold">
                  No audit logs match the current criteria.
                </td>
              </tr>
            ) : (
              logs.map(log => {
                const actionBadgeClass = ACTION_COLOR[log.action] || 'text-slate-700 bg-slate-50 border-slate-200';
                return (
                  <tr
                    key={log.log_id}
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-slate-50/60 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate max-w-[140px]" title={log.actor_email || 'SYSTEM'}>
                            {log.actor_email || 'SYSTEM'}
                          </p>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider text-center w-max ${ROLE_BADGE[log.actor_role] || ROLE_BADGE.SYSTEM}`}>
                            {log.actor_role || 'SYSTEM'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wide truncate max-w-[200px] ${actionBadgeClass}`} title={log.action}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.entity_type ? (
                        <div className="leading-tight">
                          <span className="text-xs font-bold text-slate-700">{log.entity_type}</span>
                          {log.entity_id && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1 font-bold">
                              #{log.entity_id}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-semibold">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {log.ip_address || '—'}
                    </td>
                    <td className="py-3 px-4 text-[10px] text-slate-400 font-medium truncate max-w-[180px]" title={log.user_agent}>
                      {log.user_agent || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
          <span className="text-[11px] text-slate-400 font-medium">
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Detail Drawer */}
      {selectedLog && (
        <>
          <div
            className="fixed inset-0 bg-black/20 z-[60] transition-opacity"
            onClick={() => setSelectedLog(null)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-[640px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-2xl">
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                  <History className="w-4.5 h-4.5 text-[#00478F]" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-none">
                    Audit Log Entry
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    ID: #{selectedLog.log_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Core Information Section */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Metadata Context
                </p>
                <InfoRow
                  icon={Clock}
                  label="Date / Time"
                  value={formatDateTime(selectedLog.created_at)}
                />
                <InfoRow
                  icon={Shield}
                  label="Action"
                  value={selectedLog.action.replace(/_/g, ' ')}
                  badge
                  badgeClass={ACTION_COLOR[selectedLog.action] || 'text-slate-700 bg-slate-50 border-slate-200'}
                />
                <InfoRow
                  icon={Shield}
                  label="Actor Email"
                  value={selectedLog.actor_email || 'SYSTEM'}
                  mono={!!selectedLog.actor_email}
                />
                <InfoRow
                  icon={Shield}
                  label="Actor Role"
                  value={selectedLog.actor_role || 'SYSTEM'}
                  badge
                  badgeClass={ROLE_BADGE[selectedLog.actor_role] || ROLE_BADGE.SYSTEM}
                />
                {selectedLog.actor_id && (
                  <InfoRow
                    icon={Shield}
                    label="Actor User ID"
                    value={selectedLog.actor_id}
                    mono
                  />
                )}
                {selectedLog.entity_type && (
                  <InfoRow
                    icon={Globe}
                    label="Target Entity"
                    value={`${selectedLog.entity_type} ${selectedLog.entity_id ? `#${selectedLog.entity_id}` : ''}`}
                    mono
                  />
                )}
              </div>

              {/* Network / Client Information Section */}
              <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 space-y-0.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                  Client & Network Info
                </p>
                <InfoRow
                  icon={Globe}
                  label="IP Address"
                  value={selectedLog.ip_address}
                  mono
                />
                <InfoRow
                  icon={Laptop}
                  label="User Agent"
                  value={selectedLog.user_agent}
                />
              </div>

              {/* State Changes section */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span>State Modification / Diff</span>
                </p>
                {renderDiff(selectedLog.old_values, selectedLog.new_values)}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors shadow-sm"
              >
                Close Details
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
