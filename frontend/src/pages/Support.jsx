import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Topbar from '../components/Topbar';
import SupportDrawer from '../components/SupportDrawer';
import usePageTitle from '../hooks/usePageTitle';
import { useWallet } from '../context/WalletContext';
import {
  HelpCircle, Plus, X, CheckCircle2, AlertTriangle,
  MessageSquare, Clock, Tag, Paperclip
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';
const token = () => localStorage.getItem('access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_BADGE = {
  OPEN: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};



const CATEGORIES = [
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div
      className="fixed bottom-5 right-5 z-[100] flex items-center gap-3 bg-white border border-slate-200 shadow-lg rounded-xl px-4 py-3"
      style={{ animation: 'toastIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-slate-800 leading-none">Success</p>
        <p className="text-[11px] text-slate-400 mt-0.5 leading-none">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-300 hover:text-slate-500 transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Support() {
  const navigate = useNavigate();
  const { balance } = useWallet();

  const [user, setUser] = useState({ name: 'Loading...', email: '', mobile_number: '' });
  const [tickets, setTickets] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [drawerTicketId, setDrawerTicketId] = useState(null);
  usePageTitle(drawerTicketId ? `Ticket #${drawerTicketId} • Support` : "Support");
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create ticket form
  const [form, setForm] = useState({
    category: 'FASTAG_ISSUE',
    subject: '',
    description: '',
    vehicle_id: '',
    attachment: null,
  });

  const fetchData = useCallback(async () => {
    if (!token()) { navigate('/'); return; }
    try {
      const [userRes, ticketsRes, vehiclesRes] = await Promise.all([
        axios.get(`${API}/dashboard/me`, { headers: headers() }),
        axios.get(`${API}/support/tickets`, { headers: headers() }),
        axios.get(`${API}/vehicles/my-vehicles`, { headers: headers() }),
      ]);
      setUser({
        name: userRes.data.full_name,
        email: userRes.data.email,
        mobile_number: userRes.data.mobile_number,
      });
      setTickets(ticketsRes.data);
      setVehicles(vehiclesRes.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('access_token');
        navigate('/');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!token()) { navigate('/'); return; }
    fetchData();
  }, [fetchData, navigate]);

  const handleLogout = () => { localStorage.removeItem('access_token'); navigate('/'); };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) return;
    setSubmitting(true);

    const formData = new FormData();
    formData.append('category', form.category);
    formData.append('subject', form.subject.trim());
    formData.append('description', form.description.trim());
    if (form.vehicle_id) formData.append('vehicle_id', form.vehicle_id);
    if (form.attachment) formData.append('attachment', form.attachment);

    try {
      await axios.post(`${API}/support/tickets`, formData, { 
        headers: {
          ...headers(),
          'Content-Type': 'multipart/form-data',
        }
      });
      setShowModal(false);
      setForm({ category: 'FASTAG_ISSUE', subject: '', description: '', vehicle_id: '', attachment: null });
      setToast('Support ticket created successfully.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      <style>{`
        @keyframes toastIn {
          from { opacity:0; transform:translateY(12px) scale(0.97); }
          to   { opacity:1; transform:translateY(0)    scale(1); }
        }
      `}</style>

      <Topbar user={user} balance={balance} handleLogout={handleLogout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 space-y-5">
        {/* Page header */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Operations Support</p>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
              Support Tickets
              {openCount > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {openCount} Active
                </span>
              )}
            </h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Ticket
          </button>
        </div>

        {/* Tickets table */}
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400 font-medium">Loading tickets…</div>
        ) : tickets.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-500">No support tickets yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a ticket to get help from our operations team.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">#</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subject</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vehicle</th>
                  <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map(t => (
                  <tr
                    key={t.ticket_id}
                    onClick={() => setDrawerTicketId(t.ticket_id)}
                    className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-bold text-slate-500 font-mono">#{t.ticket_id}</td>
                    <td className="py-3 px-4">
                      <p className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">{t.subject}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <MessageSquare className="w-3 h-3 text-slate-300" />
                        <span className="text-[10px] text-slate-400 font-medium">{t.message_count} messages</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">{t.category?.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_BADGE[t.status] || ''}`}>
                        {t.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase">{t.vehicle_number || '—'}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatTimeAgo(t.last_message_at || t.updated_at)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium">
        © 2026 GI Technology · All rights reserved
      </footer>

      {/* ── Create Ticket Modal ───────────────────────────────────────────────── */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-black/20 z-[60]" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create Support Ticket</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Describe your issue and our team will assist you</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select
                      value={form.category}
                      onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] focus:border-[#00478F] bg-white"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Linked Vehicle (Optional)</label>
                  <select
                    value={form.vehicle_id}
                    onChange={e => setForm({ ...form, vehicle_id: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] focus:border-[#00478F] bg-white"
                  >
                    <option value="">No vehicle linked</option>
                    {vehicles.map(v => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>{v.vehicle_number} — {v.vehicle_class}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={form.subject}
                    onChange={e => setForm({ ...form, subject: e.target.value })}
                    placeholder="Brief description of your issue"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] focus:border-[#00478F]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Provide details about the issue..."
                    rows={4}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] focus:border-[#00478F] resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Attachment (Optional)</label>
                  <div className="relative">
                    <input
                      type="file"
                      onChange={e => setForm({ ...form, attachment: e.target.files[0] })}
                      className="hidden"
                      id="ticket-attachment"
                      accept=".png,.jpg,.jpeg,.pdf"
                    />
                    <label
                      htmlFor="ticket-attachment"
                      className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-600 truncate">
                        {form.attachment ? form.attachment.name : 'Click to attach image or PDF (Max 5MB)'}
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-xs font-semibold rounded-lg transition-colors shadow-sm disabled:opacity-40"
                  >
                    {submitting ? 'Creating...' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ── Support Drawer ────────────────────────────────────────────────────── */}
      {drawerTicketId && (
        <SupportDrawer
          ticketId={drawerTicketId}
          onClose={() => setDrawerTicketId(null)}
          onRefresh={fetchData}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
