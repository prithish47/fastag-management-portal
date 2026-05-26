import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import {
  ShieldCheck, Car, Wallet, Lock, UserPlus,
  CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';

const benefits = [
  { icon: Lock,         title: 'Secure Account Access',    desc: 'Bank-grade encryption for all your data.' },
  { icon: Car,          title: 'Multi-Vehicle Management', desc: 'Manage all your FASTags from one place.' },
  { icon: Wallet,       title: 'Instant Wallet Recharge',  desc: 'Zero convenience fees on UPI payments.' },
  { icon: ShieldCheck,  title: 'Enterprise Security',      desc: 'Advanced fraud monitoring, always on.' },
];

export default function ApplyNow() {
  usePageTitle('Register');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    full_name: '', email: '', mobile_number: '',
    password: '', confirm_password: '', address: '',
  });

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');
  const [dbError,     setDbError]     = useState('');
  const [checkingDb,  setCheckingDb]  = useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('http://127.0.0.1:8000/info/db-status');
        if (res.data.status !== 'ok') setDbError('Database error: ' + res.data.message);
      } catch {
        setDbError('Cannot connect to the server. Please ensure the backend is running.');
      } finally {
        setCheckingDb(false);
      }
    })();
  }, []);

  const handleInputChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!formData.full_name || !formData.email || !formData.mobile_number || !formData.password || !formData.address) {
      setError('All fields are required.'); return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email address.'); return false;
    }
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.'); return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.'); return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!validateForm()) { setLoading(false); return; }

    try {
      const res = await axios.post('http://127.0.0.1:8000/auth/register', {
        full_name:     formData.full_name,
        email:         formData.email,
        mobile_number: formData.mobile_number,
        password:      formData.password,
        address:       formData.address,
      });
      if (res.data.message) {
        setSuccess('Account created successfully. Redirecting to login…');
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `w-full px-3.5 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00478F]/20 focus:border-[#00478F] outline-none text-sm text-slate-800 bg-slate-50 font-medium transition-colors`;

  return (
    <div className="flex-grow bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* ── Left — value panel ──────────────────────────────────────── */}
          <div className="lg:col-span-4 bg-[#00478F] rounded-xl p-8 relative overflow-hidden">
            {/* Subtle grid */}
            <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="gp" width="32" height="32" patternUnits="userSpaceOnUse">
                    <path d="M 32 0 L 0 0 0 32" fill="none" stroke="white" strokeWidth="0.75" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#gp)" />
              </svg>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold mb-6">
                <UserPlus className="w-3.5 h-3.5 text-[#f39c12]" />
                New Registration
              </div>

              <h1 className="text-2xl font-bold text-white leading-tight mb-3">
                Create your<br />
                <span className="text-[#f39c12]">FASTag Account</span>
              </h1>

              <p className="text-sm text-blue-100 leading-relaxed mb-8">
                Join India's most trusted digital toll management platform and experience frictionless travel.
              </p>

              <div className="space-y-5">
                {benefits.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-[#f39c12]" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold leading-none">{title}</p>
                      <p className="text-blue-200 text-xs mt-1 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right — registration form ───────────────────────────────── */}
          <div className="lg:col-span-8">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Card top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-[#00478F] to-[#f39c12]" />

              <div className="p-8">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Apply Now</h2>
                <p className="text-sm text-slate-500 mb-6">Fill in your details to create a FASTag account.</p>

                {/* Alerts */}
                {error && (
                  <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3.5 py-3">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}
                {success && (
                  <div className="mb-5 flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3.5 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium text-emerald-700">{success}</p>
                  </div>
                )}

                {checkingDb ? (
                  <div className="flex flex-col items-center py-12 gap-3">
                    <Loader2 className="w-7 h-7 text-[#00478F] animate-spin" />
                    <p className="text-sm text-slate-500 font-medium">Connecting to secure servers…</p>
                  </div>
                ) : dbError ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                    <h3 className="text-sm font-bold text-red-800 mb-1">Registration Unavailable</h3>
                    <p className="text-xs text-red-600 leading-relaxed">{dbError}</p>
                  </div>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full Name</label>
                        <input type="text" name="full_name" required value={formData.full_name} onChange={handleInputChange} className={inputCls} placeholder="e.g. Rahul Sharma" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Mobile Number</label>
                        <input type="tel" name="mobile_number" required value={formData.mobile_number} onChange={handleInputChange} className={inputCls} placeholder="9876543210" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
                      <input type="email" name="email" required value={formData.email} onChange={handleInputChange} className={inputCls} placeholder="customer@domain.com" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                        <input type="password" name="password" required value={formData.password} onChange={handleInputChange} className={inputCls} placeholder="Min. 6 characters" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm Password</label>
                        <input type="password" name="confirm_password" required value={formData.confirm_password} onChange={handleInputChange} className={inputCls} placeholder="••••••••" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Communication Address</label>
                      <textarea
                        name="address"
                        required
                        rows={3}
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`${inputCls} resize-none`}
                        placeholder="Enter your full postal address…"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !!success}
                      className="w-full py-2.5 px-4 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating account…
                        </span>
                      ) : 'Create Account'}
                    </button>

                    <p className="text-center text-xs text-slate-500">
                      Already have an account?{' '}
                      <Link to="/" className="font-semibold text-[#f39c12] hover:text-[#d68910] transition-colors">
                        Sign in →
                      </Link>
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
