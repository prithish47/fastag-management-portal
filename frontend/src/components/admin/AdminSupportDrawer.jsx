import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Send, Clock, AlertTriangle, Tag, Car, User, CheckCircle2, MessageSquare, Edit3, Paperclip, FileText, Download } from 'lucide-react';

const BASE_URL = 'http://127.0.0.1:8000';
const API = `${BASE_URL}/admin`;
const token = () => sessionStorage.getItem('admin_access_token');
const headers = () => ({ Authorization: `Bearer ${token()}` });

const STATUS_BADGE = {
  OPEN: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function InfoRow({ icon: Icon, label, value, badge, badgeClass, mono }) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </div>
      {badge ? (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}>{value}</span>
      ) : (
        <span className={`text-xs font-semibold text-slate-800 text-right ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      )}
    </div>
  );
}

export default function AdminSupportDrawer({ ticketId, onClose, onRefreshParent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversation');
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const fetchTicket = async () => {
    try {
      const res = await axios.get(`${API}/support/tickets/${ticketId}`, { headers: headers() });
      setData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to load ticket details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    if (activeTab === 'conversation' && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [data?.messages, activeTab]);

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !attachment) return;
    setActionLoading(true);

    const formData = new FormData();
    formData.append('message', replyText.trim());
    if (attachment) formData.append('attachment', attachment);

    try {
      await axios.post(`${API}/support/tickets/${ticketId}/reply`, formData, { 
        headers: {
          ...headers(),
          'Content-Type': 'multipart/form-data',
        }
      });
      setReplyText('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await fetchTicket();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send reply');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    setActionLoading(true);
    try {
      await axios.patch(`${API}/support/tickets/${ticketId}/status`, { status }, { headers: headers() });
      await fetchTicket();
      onRefreshParent?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  if (!ticketId) return null;

  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const vehicle = data?.vehicle;
  const isClosed = ticket?.status === 'CLOSED';

  const tabs = [
    { key: 'conversation', label: 'Conversation', icon: MessageSquare },
    { key: 'summary', label: 'Summary', icon: Tag },
    { key: 'actions', label: 'Actions', icon: Edit3 },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-[550px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-start justify-between z-10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-slate-400 font-mono">#{ticketId}</span>
              {ticket && (
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${STATUS_BADGE[ticket.status]}`}>
                  {ticket.status.replace('_', ' ')}
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900 leading-snug pr-4">
              {ticket?.subject || 'Loading ticket...'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 -mr-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-100 px-5 flex gap-0.5 shrink-0 overflow-x-auto bg-white">
          {tabs.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveTab(s.key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                activeTab === s.key
                  ? 'text-[#00478F] border-[#00478F]'
                  : 'text-slate-400 border-transparent hover:text-slate-600'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium">
              Loading ticket data...
            </div>
          ) : (
            <>
              {/* SUMMARY TAB */}
              {activeTab === 'summary' && (
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Ticket Metadata</p>
                    <InfoRow icon={Tag} label="Category" value={ticket.category.replace(/_/g, ' ')} />
                    <InfoRow icon={Clock} label="Created At" value={formatDateTime(ticket.created_at)} />
                    <InfoRow icon={Clock} label="Last Updated" value={formatDateTime(ticket.updated_at)} />
                    {ticket.closed_at && (
                      <InfoRow icon={CheckCircle2} label="Closed At" value={formatDateTime(ticket.closed_at)} />
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">User Context</p>
                    <InfoRow icon={User} label="User Name" value={ticket.user_name} />
                    <InfoRow icon={User} label="User Email" value={ticket.user_email} mono />
                    {vehicle ? (
                      <>
                        <InfoRow icon={Car} label="Vehicle" value={vehicle.vehicle_number} mono />
                        <InfoRow icon={Car} label="Vehicle Class" value={vehicle.vehicle_class} />
                        <InfoRow icon={Tag} label="FASTag Status" value={vehicle.fastag_status} badge badgeClass={vehicle.fastag_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'} />
                      </>
                    ) : (
                      <div className="py-2 text-[11px] text-slate-400 italic">No vehicle linked to this ticket</div>
                    )}
                  </div>
                </div>
              )}

              {/* ACTIONS TAB */}
              {activeTab === 'actions' && (
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Status Controls</p>
                    
                    {isClosed ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-600">Ticket is Closed</p>
                        <p className="text-[11px] text-slate-400 mt-1">Closed tickets cannot be reopened or modified.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ticket.status === 'OPEN' && (
                          <button
                            onClick={() => handleStatusChange('IN_PROGRESS')}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            Mark as In Progress
                          </button>
                        )}
                        
                        {ticket.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleStatusChange('RESOLVED')}
                            disabled={actionLoading}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Resolve Ticket
                          </button>
                        )}

                        <button
                          onClick={() => handleStatusChange('CLOSED')}
                          disabled={actionLoading}
                          className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" /> Close Ticket (Terminal)
                        </button>
                        
                        <p className="text-[10px] text-slate-400 text-center mt-4">
                          Note: Replying to the ticket automatically transitions OPEN status to IN PROGRESS.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CONVERSATION TAB */}
              {activeTab === 'conversation' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {messages.map((m) => {
                      const isAdmin = m.sender_role === 'ADMIN';
                      return (
                        <div key={m.message_id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isAdmin ? 'text-[#00478F]' : 'text-slate-400'}`}>
                              {isAdmin ? m.sender_name : ticket.user_name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-medium">
                              {formatDateTime(m.created_at)}
                            </span>
                          </div>
                          <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                            isAdmin 
                              ? 'bg-slate-100 border border-slate-200 text-slate-800 rounded-tr-sm' 
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm border-l-4 border-l-[#00478F]'
                          }`}>
                            {m.message.split('\n').map((line, j) => (
                              <React.Fragment key={j}>
                                {line}
                                {j !== m.message.split('\n').length - 1 && <br />}
                              </React.Fragment>
                            ))}

                            {m.attachment_path && (
                              <div className={`mt-2.5 p-2 rounded-lg border ${
                                isAdmin ? 'bg-white/50 border-slate-200' : 'bg-slate-50 border-[#00478F]/10'
                              }`}>
                                {m.attachment_path.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? (
                                  <a href={`${BASE_URL}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} target="_blank" rel="noreferrer" className="block group relative">
                                    <img 
                                      src={`${BASE_URL}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} 
                                      alt="attachment" 
                                      className="max-w-full rounded-md shadow-sm border border-slate-200/50" 
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                      <Download className="w-5 h-5 text-white" />
                                    </div>
                                  </a>
                                ) : (
                                  <a 
                                    href={`${BASE_URL}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-[11px] font-bold text-[#00478F]"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="underline truncate max-w-[150px]">{m.attachment_name || 'View Attachment'}</span>
                                    <Download className="w-3 h-3 ml-auto shrink-0" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Reply Box */}
                  <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                    {isClosed ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center text-xs font-medium text-slate-500">
                        This ticket is closed. Replies are disabled.
                      </div>
                    ) : (
                      <form onSubmit={handleReply} className="space-y-3">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 relative">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply to the user..."
                              className="w-full min-h-[44px] max-h-32 px-3 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#00478F] resize-y"
                              rows={1}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleReply(e);
                                }
                              }}
                            />
                            
                            <input
                              type="file"
                              ref={fileInputRef}
                              className="hidden"
                              onChange={(e) => setAttachment(e.target.files[0])}
                              accept=".png,.jpg,.jpeg,.pdf"
                            />
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className={`absolute right-2 bottom-2 p-1.5 rounded-md transition-colors ${
                                attachment ? 'bg-blue-50 text-[#00478F]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                              }`}
                              title="Attach file"
                            >
                              <Paperclip className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="submit"
                            disabled={(!replyText.trim() && !attachment) || actionLoading}
                            className="h-11 px-4 bg-[#00478F] hover:bg-[#003a75] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm"
                          >
                            {actionLoading ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {attachment && (
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{attachment.name}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                setAttachment(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
