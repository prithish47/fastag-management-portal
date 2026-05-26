import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAdminAuth } from '../../context/AdminAuthContext';
import usePageTitle from '../../hooks/usePageTitle';
import AdminTopbar from '../../components/admin/AdminTopbar';
import AdminActivityFeed from '../../components/admin/AdminActivityFeed';
import AdminUsersTable from './AdminUsersTable';
import AdminVehiclesTable from './AdminVehiclesTable';
import AdminTransactionsTable from './AdminTransactionsTable';
import AdminFastagInventory from './AdminFastagInventory';
import AdminAuditLogsTable from './AdminAuditLogsTable';
import AdminSupportTable from './AdminSupportTable';
import UserDrawer from '../../components/admin/UserDrawer';
import VehicleDrawer from '../../components/admin/VehicleDrawer';
import FastagDrawer from '../../components/admin/FastagDrawer';
import AdminSupportDrawer from '../../components/admin/AdminSupportDrawer';
import AdminSidebar from '../../components/admin/AdminSidebar';
import {
  Users, Car, Zap, ZapOff, FileSearch, Wallet,
  Activity, AlertTriangle, Package, Tag, Shield, CheckCircle, X
} from 'lucide-react';

// ── Format Time Ago Helper ───────────────────────────────────────────────────
function formatTimeAgo(isoString) {
  if (!isoString) return '—';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ── Compact metric card ───────────────────────────────────────────────────────
function MetricCard({ label, value, sub, icon: Icon, iconColor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdminAuthenticated, adminLogout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Review Queue state ──────────────────────────────────────────────────────
  const [reviewQueue, setReviewQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  // ── Integrity Engine state ──────────────────────────────────────────────────
  const [anomalies, setAnomalies] = useState([]);
  const [anomaliesLoading, setAnomaliesLoading] = useState(true);
  const [resolveSummary, setResolveSummary] = useState(null);
  const [resolving, setResolving] = useState(false);

  // ── Drawer state ────────────────────────────────────────────────────────────
  const [drawer, setDrawer] = useState({ type: null, id: null, backTo: null });
  // Incremented to signal child tables to refetch
  const [refreshKey, setRefreshKey] = useState(0);

  const getAdminPageTitle = () => {
    if (drawer.type === 'support' && drawer.id) {
      return `Ticket #${drawer.id} • Support`;
    }
    switch (activeTab) {
      case 'users':
        return 'User Management';
      case 'vehicles':
        return 'Vehicle Management';
      case 'transactions':
        return 'Transaction Monitoring';
      case 'fastag':
        return 'FASTag Warehouse';
      case 'audit':
        return 'System Audit Logs';
      case 'support':
        return 'Support Queue';
      default:
        return 'Admin Dashboard';
    }
  };
  usePageTitle(getAdminPageTitle());

  const openUserDrawer = (userId) => setDrawer({ type: 'user', id: userId, backTo: null });
  const openVehicleDrawer = (vehicleId, backTo) => setDrawer({ type: 'vehicle', id: vehicleId, backTo: backTo || null });
  const openFastagDrawer = (tagId) => setDrawer({ type: 'fastag', id: tagId, backTo: null });
  const openSupportDrawer = (ticketId) => setDrawer({ type: 'support', id: ticketId, backTo: null });
  const closeDrawer = () => setDrawer({ type: null, id: null, backTo: null });

  const fetchReviewQueue = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_access_token');
      if (!token) return;
      const res = await axios.get('http://127.0.0.1:8000/admin/review-queue', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviewQueue(res.data);
    } catch (err) {
      console.error("Failed to fetch review queue:", err);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  const fetchAnomalies = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_access_token');
      if (!token) return;
      const res = await axios.get('http://127.0.0.1:8000/admin/integrity/check', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAnomalies(res.data.anomalies || []);
    } catch (err) {
      console.error("Failed to fetch integrity anomalies:", err);
    } finally {
      setAnomaliesLoading(false);
    }
  }, []);

  const handleRefreshParent = () => {
    setRefreshKey(k => k + 1);
    fetchMetrics();
    fetchReviewQueue();
    fetchAnomalies();
  };

  useEffect(() => {
    if (!isAdminAuthenticated) {
      navigate('/admin-login');
    }
  }, [isAdminAuthenticated, navigate]);

  const fetchMetrics = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const res = await axios.get('http://127.0.0.1:8000/admin/dashboard/metrics', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (err) {
      console.error("Dashboard initialization failed:", err);
      adminLogout();
      navigate('/admin-login');
    } finally {
      setLoading(false);
    }
  }, [adminLogout, navigate]);

  useEffect(() => {
    fetchMetrics();
    fetchReviewQueue();
    fetchAnomalies();
  }, [fetchMetrics, fetchReviewQueue, fetchAnomalies]);

  const handleResolve = useCallback(async () => {
    const token = sessionStorage.getItem('admin_access_token');
    if (!token) return;
    setResolving(true);
    try {
      const res = await axios.post('http://127.0.0.1:8000/admin/integrity/resolve', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResolveSummary(res.data);
      handleRefreshParent();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to resolve anomalies.");
    } finally {
      setResolving(false);
    }
  }, []);

  // ── Render active tab content ───────────────────────────────────────────────
  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <AdminUsersTable onRowClick={openUserDrawer} refreshKey={refreshKey} />;
      case 'vehicles':
        return <AdminVehiclesTable onRowClick={openVehicleDrawer} refreshKey={refreshKey} />;
      case 'transactions':
        return <AdminTransactionsTable />;
      case 'fastag':
        return <AdminFastagInventory onRowClick={openFastagDrawer} refreshKey={refreshKey} />;
      case 'audit':
        return <AdminAuditLogsTable refreshKey={refreshKey} />;
      case 'support':
        return <AdminSupportTable onRowClick={openSupportDrawer} refreshKey={refreshKey} />;
      default:
        return renderDashboardContent();
    }
  };

  const renderDashboardContent = () => (
    <div className="space-y-6">
      {/* Metrics strip */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
          <MetricCard
            label="Total Users"
            value={metrics.total_users}
            sub="Registered accounts"
            icon={Users}
            iconColor="text-[#00478F]"
          />
          <MetricCard
            label="Total Vehicles"
            value={metrics.total_vehicles}
            sub="Registered fleet"
            icon={Car}
            iconColor="text-slate-400"
          />
          <MetricCard
            label="Active FASTags"
            value={metrics.active_fastags}
            sub="Currently active"
            icon={Zap}
            iconColor="text-emerald-500"
          />
          <MetricCard
            label="Disabled FASTags"
            value={metrics.disabled_fastags}
            sub="Deactivated"
            icon={ZapOff}
            iconColor="text-red-500"
          />
          <MetricCard
            label="Pending RC"
            value={metrics.pending_rc_verifications}
            sub="Awaiting review"
            icon={FileSearch}
            iconColor="text-amber-500"
          />
          <MetricCard
            label="Wallet Volume"
            value={`₹${metrics.wallet_volume.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            sub="Total balance"
            icon={Wallet}
            iconColor="text-[#00478F]"
          />
          <MetricCard
            label="Today's Txns"
            value={metrics.today_transactions}
            sub="Transactions today"
            icon={Activity}
            iconColor="text-slate-500"
          />
          <MetricCard
            label="Failed Txns"
            value={metrics.failed_transactions}
            sub="All time"
            icon={AlertTriangle}
            iconColor="text-red-500"
          />
          <MetricCard
            label="FASTag Inventory"
            value={metrics.total_fastag_inventory}
            sub={`${metrics.available_fastags} available`}
            icon={Package}
            iconColor="text-indigo-500"
          />
        </div>
      )}

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left — Tables (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Needs Review Queue Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Needs Review
                </h3>
                {reviewQueue.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {reviewQueue.length}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Operational Work Queue
              </span>
            </div>

            {queueLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">Loading review queue…</div>
            ) : reviewQueue.length === 0 ? (
              <div className="py-8 text-center text-xs font-semibold text-slate-400">
                No items in review queue. Everything is up-to-date!
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {reviewQueue.map(item => (
                  <div key={item.vehicle_id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border border-slate-100 hover:border-slate-200 rounded-lg hover:bg-slate-50/50 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded border border-slate-200/60">
                          {item.vehicle_number}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          by {item.owner_name}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Awaiting action for {formatTimeAgo(item.created_at)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Review Type Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        item.review_type === 'NEW_REGISTRATION' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' :
                        item.review_type === 'FASTAG_PENDING' || item.review_type === 'RC_PENDING' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' :
                        item.review_type === 'RC_FRONT_MISSING' || item.review_type === 'RC_BACK_MISSING' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' :
                        'bg-purple-50 text-purple-700 ring-1 ring-purple-200' // RC_REUPLOAD_REQUIRED
                      }`}>
                        {item.review_type.replace('_', ' ')}
                      </span>
                    </div>

                    <div>
                      <button
                        onClick={() => openVehicleDrawer(item.vehicle_id)}
                        className="w-full sm:w-auto px-3.5 py-1.5 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm animate-pulse-subtle"
                      >
                        Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warehouse Integrity Alerts Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Warehouse Integrity Alerts
                </h3>
                {anomalies.length > 0 ? (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {anomalies.length} anomaly
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Healthy
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Automated Integrity Check
              </span>
            </div>

            {anomaliesLoading ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">Scanning warehouse database…</div>
            ) : anomalies.length === 0 ? (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-800">Operational Integrity Intact</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5 font-medium">
                    No duplicate assignments, status mismatches, or orphaned active tags detected.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {anomalies.map((anom, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 bg-slate-50 border border-slate-100 rounded-lg">
                      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        anom.severity === 'high' ? 'bg-red-500 animate-pulse' :
                        anom.severity === 'medium' ? 'bg-amber-500' :
                        'bg-slate-400'
                      }`} />
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-slate-700 leading-relaxed">{anom.message}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{anom.type.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {resolving ? "Resolving..." : "Run Auto-Resolution"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <AdminUsersTable onRowClick={openUserDrawer} refreshKey={refreshKey} />
        </div>

        {/* Right — Activity Feed (4 cols) */}
        <div className="lg:col-span-4">
          <AdminActivityFeed />
        </div>
      </div>
    </div>
  );

  if (!isAdminAuthenticated) {
    return null;
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-[#f8f9fb] flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-xl bg-[#00478F] flex items-center justify-center mb-4 animate-pulse">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <p className="text-sm font-semibold text-slate-600">Loading Operations Console...</p>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">Verifying administrator credentials</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex h-screen overflow-hidden">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <AdminTopbar activeTab={activeTab} onTabChange={setActiveTab} />

        <main className="flex-1 overflow-y-auto w-full px-6 py-6 space-y-5">
          {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Operations Console</p>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              {activeTab === 'dashboard' ? (
                <>
                  Admin Dashboard
                  {reviewQueue.length > 0 && (
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                      {reviewQueue.length} Needs Review
                    </span>
                  )}
                </>
              ) :
               activeTab === 'users' ? 'User Management' :
               activeTab === 'vehicles' ? 'Vehicle Management' :
               activeTab === 'transactions' ? 'Transaction Monitoring' :
               activeTab === 'fastag' ? 'FASTag Warehouse' :
               activeTab === 'audit' ? 'System Audit Logs' : 'Admin Dashboard'}
            </h1>
          </div>
          {activeTab !== 'dashboard' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className="text-xs font-semibold text-[#00478F] hover:text-[#003a75] transition-colors"
            >
              ← Back to Dashboard
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400 font-medium">Loading dashboard…</div>
        ) : (
          /* Tab Content */
          <div className="max-w-7xl mx-auto pb-10">
            {renderTabContent()}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium shrink-0 mt-auto">
        © 2026 GI Technology · Admin Operations · All rights reserved
      </footer>
      
      </div> {/* <-- Closing tag for the flex-1 right side column */}

      {/* ── Drawers ────────────────────────────────────────────────────────────── */}
      {drawer.type === 'user' && (
        <UserDrawer
          userId={drawer.id}
          onClose={closeDrawer}
          onOpenVehicle={(vehicleId) => openVehicleDrawer(vehicleId, { type: 'user', id: drawer.id })}
          onRefreshParent={handleRefreshParent}
        />
      )}

      {drawer.type === 'vehicle' && (
        <VehicleDrawer
          vehicleId={drawer.id}
          onClose={closeDrawer}
          onBack={drawer.backTo ? () => setDrawer({ type: drawer.backTo.type, id: drawer.backTo.id, backTo: null }) : null}
          backLabel={drawer.backTo ? '← Back to User' : null}
          onRefreshParent={handleRefreshParent}
        />
      )}

      {drawer.type === 'fastag' && (
        <FastagDrawer
          tagId={drawer.id}
          onClose={closeDrawer}
          onRefreshParent={handleRefreshParent}
        />
      )}

      {drawer.type === 'support' && (
        <AdminSupportDrawer
          ticketId={drawer.id}
          onClose={closeDrawer}
          onRefreshParent={handleRefreshParent}
        />
      )}

      {/* Integrity Resolution Modal */}
      {resolveSummary && (
        <div className="fixed inset-0 bg-black/45 z-[100] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-500" />
                Integrity Resolution Summary
              </h3>
              <button 
                onClick={() => setResolveSummary(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-2.5">
              <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                The automated integrity engine executed successfully and applied {resolveSummary.resolved_count} resolution actions:
              </p>
              {resolveSummary.resolved && resolveSummary.resolved.length > 0 ? (
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-3 max-h-60 overflow-y-auto space-y-1.5">
                  {resolveSummary.resolved.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-semibold">
                      <span className="text-emerald-600 shrink-0">✓</span>
                      <span className="leading-tight">{act}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-center text-xs text-slate-400 font-medium">
                  No actions were required.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setResolveSummary(null)}
                className="px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
