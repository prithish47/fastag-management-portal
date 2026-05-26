import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import usePageTitle from '../hooks/usePageTitle';
import { Shield, Eye, EyeOff, AlertTriangle, Lock } from 'lucide-react';

export default function AdminLogin() {
  usePageTitle('Admin Login');
  const navigate = useNavigate();
  const { adminLogin } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await adminLogin(email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      const detail = err.response?.data?.detail || 'Login failed. Check credentials.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between h-[64px] items-center">
            <Link to="/" className="flex items-center gap-3 shrink-0">
              <img src="/Fastag_logo.png" alt="FASTag" className="h-8 object-contain" />
              <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              <img src="/GI_Technology.png" alt="GI Technology" className="h-7 object-contain hidden sm:block" />
            </Link>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
              <Lock className="w-3.5 h-3.5" />
              Admin Portal
            </div>
          </div>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-[#00478F] flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Admin Operations Portal</h1>
            <p className="text-sm text-slate-500 mt-1">GI Technology · Internal Access Only</p>
          </div>

          {/* Form Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            {error && (
              <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-5">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Email Address
                </label>
                <input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] transition-colors"
                  placeholder="admin@gitechnology.in"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] transition-colors pr-10"
                    placeholder="Enter admin password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="admin-login-btn"
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Admin Portal'}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <div className="text-center mt-6">
            <p className="text-[11px] text-slate-400 font-medium">
              Authorized personnel only. All access is logged and monitored.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[11px] text-slate-400 font-medium">
        © 2026 GI Technology · Admin Operations · All rights reserved
      </footer>
    </div>
  );
}
