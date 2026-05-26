import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function ForgotPassword() {
  usePageTitle('Forgot Password');
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error,   setError]   = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/forgot-password', { email });
      setMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.detail || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow bg-slate-50 flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-[#00478F] to-[#f39c12]" />

          <div className="p-8">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5 text-[#00478F]" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 leading-none">Reset your password</h2>
                <p className="text-xs text-slate-400 mt-0.5">We'll send a secure reset link to your inbox.</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-red-700">{error}</p>
              </div>
            )}

            {message ? (
              <div className="text-center">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-emerald-800 mb-1">Reset link sent</h3>
                  <p className="text-xs text-emerald-700 leading-relaxed">{message}</p>
                  <p className="text-[11px] text-emerald-600 mt-2">Check your inbox and spam folder.</p>
                </div>
                <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00478F] hover:text-[#003a75] transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    Registered Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] outline-none text-sm text-slate-800 bg-slate-50 font-medium transition-colors"
                    placeholder="customer@domain.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending link…
                    </span>
                  ) : 'Send Reset Link'}
                </button>

                <div className="text-center pt-1">
                  <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-[#00478F] transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to login
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
