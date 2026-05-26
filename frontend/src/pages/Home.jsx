import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import usePageTitle from '../hooks/usePageTitle';
import {
  ShieldCheck, Car, Wallet, Lock, Activity,
  CheckCircle2, HelpCircle, AlertCircle
} from 'lucide-react';

const features = [
  {
    icon: Car,
    name: 'Fleet Management',
    description: 'Track and manage FASTag balances for your entire vehicle fleet from a single dashboard.',
  },
  {
    icon: Wallet,
    name: 'Instant Recharge',
    description: 'Real-time balance alerts and instant secure wallet top-ups via UPI, Cards, or Net Banking.',
  },
  {
    icon: ShieldCheck,
    name: 'RC Verification',
    description: 'Automated vehicle registration certificate verification linked to your enterprise account.',
  },
  {
    icon: Lock,
    name: 'Bank-Grade Security',
    description: 'End-to-end encryption protecting all toll transactions, financial data and payment history.',
  },
];

export default function Home() {
  usePageTitle('Home');
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const startTime = Date.now();

    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/login', { email, password });

      if (response.data?.access_token) {
        localStorage.setItem('access_token', response.data.access_token);
        setLoginSuccess(true);

        const elapsed = Date.now() - startTime;
        const minDelay = 1500;
        if (elapsed < minDelay) {
          await new Promise(r => setTimeout(r, minDelay - elapsed));
        }
        navigate('/dashboard');
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col">
      {loginSuccess && <LoadingScreen />}

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="bg-[#00478F] relative overflow-hidden">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.75" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#g)" />
          </svg>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="py-16 md:py-24 lg:flex lg:items-center lg:gap-16">

            {/* Left — hero copy */}
            <div className="lg:w-1/2 mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6">
                <Activity className="w-3.5 h-3.5 text-[#f39c12]" />
                India's Trusted Toll Network
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-tight tracking-tight mb-5">
                Seamless travel with<br />
                <span className="text-[#f39c12]">GI Technology FASTag</span>
              </h1>

              <p className="text-base text-blue-100 mb-8 max-w-lg leading-relaxed">
                Recharge, manage and track your toll transactions in one place.
                Banking-grade infrastructure, zero convenience fees.
              </p>

              <div className="grid grid-cols-2 gap-3 max-w-sm">
                {['Instant Recharge', '24/7 Support', 'Zero Convenience Fee', 'Easy KYC'].map(item => (
                  <div key={item} className="flex items-center gap-2.5 bg-white/10 border border-white/15 px-3 py-2.5 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-[#f39c12] shrink-0" />
                    <span className="text-white text-sm font-medium">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — login card */}
            <div className="lg:w-1/2 lg:flex lg:justify-end" id="login">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md relative overflow-hidden border border-white/10">
                {/* Top accent */}
                <div className="h-1 w-full bg-gradient-to-r from-[#00478F] to-[#f39c12]" />

                <div className="p-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Sign in to your account</h2>
                  <p className="text-sm text-slate-500 mb-6">Access your FASTag management dashboard</p>

                  {error && (
                    <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Email Address
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] outline-none text-sm text-slate-800 bg-slate-50 font-medium transition-colors"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          id="remember-me"
                          type="checkbox"
                          className="w-3.5 h-3.5 rounded border-slate-300 text-[#00478F] focus:ring-[#00478F]/20 cursor-pointer"
                        />
                        <span className="text-xs font-medium text-slate-500">Remember me</span>
                      </label>
                      <Link to="/forgot-password" className="text-xs font-semibold text-[#00478F] hover:text-[#003a75] transition-colors">
                        Forgot password?
                      </Link>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-1"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Signing in…
                        </span>
                      ) : 'Sign In'}
                    </button>

                    <p className="text-center text-xs text-slate-500 pt-1">
                      No account?{' '}
                      <Link to="/register" className="font-semibold text-[#f39c12] hover:text-[#d68910] transition-colors">
                        Apply for FASTag →
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ── Features ─────────────────────────────────────────────────────── */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-10">
            <p className="text-xs font-semibold text-[#00478F] uppercase tracking-widest mb-2">Why GI Technology</p>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Everything you need to manage your FASTag</h2>
            <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
              Trusted by thousands of fleet operators across India for reliable, secure, and zero-fee toll management.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="group bg-white border border-slate-200 hover:border-[#00478F]/30 rounded-xl p-6 transition-colors duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-50 group-hover:bg-[#00478F] flex items-center justify-center mb-4 transition-colors duration-200">
                  <f.icon className="w-4.5 h-4.5 text-[#00478F] group-hover:text-white transition-colors duration-200" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-2">{f.name}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
