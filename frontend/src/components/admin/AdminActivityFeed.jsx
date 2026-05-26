import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Activity, Wallet, Car, FileText, Shield, Zap, RefreshCw } from 'lucide-react';

const ACTIVITY_ICONS = {
  WALLET_RECHARGE: { icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  FASTAG_DISABLED: { icon: Shield, color: 'text-red-600', bg: 'bg-red-50' },
  FASTAG_ENABLED:  { icon: Zap, color: 'text-blue-600', bg: 'bg-blue-50' },
  FASTAG_REPLACED: { icon: RefreshCw, color: 'text-amber-600', bg: 'bg-amber-50' },
  FASTAG_UPDATED:  { icon: Shield, color: 'text-slate-600', bg: 'bg-slate-50' },
  VEHICLE_ADDED:   { icon: Car, color: 'text-[#00478F]', bg: 'bg-blue-50' },
  RC_UPLOADED:     { icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  RC_VERIFIED:     { icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  RC_REJECTED:     { icon: FileText, color: 'text-red-600', bg: 'bg-red-50' },
  TOLL_CROSSED:    { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' },
};

function getRelativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminActivityFeed() {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('admin_access_token');
      const res = await axios.get('http://127.0.0.1:8000/admin/activity-feed?limit=30', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeed(res.data);
    } catch (err) {
      console.error('Failed to fetch activity feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchFeed]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Operations</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[9px] font-semibold text-emerald-600 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400 font-medium">Loading feed…</div>
        ) : feed.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400 font-medium">No recent activity</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {feed.map((item) => {
              const config = ACTIVITY_ICONS[item.activity_type] || ACTIVITY_ICONS.TOLL_CROSSED;
              const Icon = config.icon;
              return (
                <div key={item.log_id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex gap-3">
                    <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 leading-tight">
                        {item.activity_message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {item.vehicle_number && (
                          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.vehicle_number}
                          </span>
                        )}
                        {item.owner_name && (
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            {item.owner_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 font-medium">
                        {getRelativeTime(item.timestamp_iso)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
