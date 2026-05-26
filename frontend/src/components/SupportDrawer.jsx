import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Send, Clock, AlertTriangle, Tag, Car, User, CheckCircle2, Paperclip, FileText, Download } from 'lucide-react';

const API = 'http://127.0.0.1:8000';
const token = () => localStorage.getItem('access_token');
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
    <div className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0">
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

export default function SupportDrawer({ ticketId, onClose, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversation');
  const [replyText, setReplyText] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [sending, setSending] = useState(false);
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
    setSending(true);

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
      onRefresh?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  if (!ticketId) return null;

  const ticket = data?.ticket;
  const messages = data?.messages || [];
  const isClosed = ticket?.status === 'CLOSED';

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-[60]" onClick={onClose} />
      
      <div className="fixed inset-y-0 right-0 w-full max-w-[480px] bg-white border-l border-slate-200 z-[61] flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between z-10 shrink-0">
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
        <div className="flex px-5 border-b border-slate-100 shrink-0">
          <button
            onClick={() => setActiveTab('conversation')}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'conversation' ? 'text-[#00478F] border-[#00478F]' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            Conversation
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider border-b-2 transition-colors ${
              activeTab === 'details' ? 'text-[#00478F] border-[#00478F]' : 'text-slate-400 border-transparent hover:text-slate-600'
            }`}
          >
            Details
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col bg-slate-50/50">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium">
              Loading ticket...
            </div>
          ) : activeTab === 'details' ? (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <InfoRow icon={Tag} label="Category" value={ticket.category.replace(/_/g, ' ')} />
                <InfoRow icon={Car} label="Vehicle" value={ticket.vehicle_number} mono />
                <InfoRow icon={Clock} label="Created At" value={formatDateTime(ticket.created_at)} />
                <InfoRow icon={Clock} label="Last Updated" value={formatDateTime(ticket.updated_at)} />
                {ticket.closed_at && (
                  <InfoRow icon={CheckCircle2} label="Closed At" value={formatDateTime(ticket.closed_at)} />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((m, i) => {
                  const isUser = m.sender_role === 'USER';
                  return (
                    <div key={m.message_id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isUser ? 'You' : 'Admin'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium">
                          {formatDateTime(m.created_at)}
                        </span>
                      </div>
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                        isUser 
                          ? 'bg-[#00478F] text-white rounded-tr-sm' 
                          : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                      }`}>
                        {m.message.split('\n').map((line, j) => (
                          <React.Fragment key={j}>
                            {line}
                            {j !== m.message.split('\n').length - 1 && <br />}
                          </React.Fragment>
                        ))}

                        {m.attachment_path && (
                          <div className={`mt-2.5 p-2 rounded-lg border ${
                            isUser ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-200'
                          }`}>
                            {m.attachment_path.toLowerCase().match(/\.(jpg|jpeg|png)$/) ? (
                              <a href={`${API}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} target="_blank" rel="noreferrer" className="block group relative">
                                <img 
                                  src={`${API}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} 
                                  alt="attachment" 
                                  className="max-w-full rounded-md shadow-sm border border-slate-200/20" 
                                />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-md">
                                  <Download className="w-5 h-5 text-white" />
                                </div>
                              </a>
                            ) : (
                              <a 
                                href={`${API}/support/tickets/${ticketId}/messages/${m.message_id}/attachment?token=${token()}`} 
                                target="_blank" 
                                rel="noreferrer"
                                className={`flex items-center gap-2 text-[11px] font-bold ${isUser ? 'text-white' : 'text-[#00478F]'}`}
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
                    This ticket is closed. You can no longer reply.
                  </div>
                ) : (
                  <form onSubmit={handleReply} className="space-y-3">
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 relative">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply here..."
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
                        disabled={(!replyText.trim() && !attachment) || sending}
                        className="h-11 px-4 bg-[#00478F] hover:bg-[#003a75] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-sm"
                      >
                        {sending ? (
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
        </div>
      </div>
    </>
  );
}
