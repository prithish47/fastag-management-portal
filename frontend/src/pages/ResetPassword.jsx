import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import usePageTitle from '../hooks/usePageTitle';
import { Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  usePageTitle('Reset Password');
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get('token');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    password: '',
    confirm_password: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/auth/reset-password', { 
        token: token,
        new_password: formData.password 
      });
      setMessage(response.data.message);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/');
      }, 3000);
      
    } catch (err) {
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('An unexpected error occurred. The token might have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex flex-col font-sans text-slate-900 bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-10 border-t-4 border-[#00478F]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
              <Lock className="w-8 h-8 text-[#00478F]" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900">Create New Password</h2>
            <p className="text-slate-500 mt-2 font-medium leading-relaxed">
              Please enter your new password below. Make sure it's secure and at least 6 characters long.
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {message ? (
            <div className="text-center">
              <div className="mb-6 bg-green-50 border-2 border-green-200 p-6 rounded-xl">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-green-800 mb-2">Password Updated!</h3>
                <p className="text-sm font-medium text-green-700 leading-relaxed">
                  {message}
                </p>
                <p className="text-xs text-green-600 mt-4 animate-pulse">
                  Redirecting to login...
                </p>
              </div>
              <Link to="/" className="inline-flex items-center text-sm font-bold text-[#00478F] hover:text-[#003366] transition-colors">
                Go to Login <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center mt-6">
              <Link to="/forgot-password" className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#00478F] hover:bg-[#003366] transition-all uppercase tracking-wide">
                Request New Link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#00478F] focus:border-transparent transition-all outline-none text-slate-900 bg-slate-50 font-medium"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  name="confirm_password"
                  required
                  value={formData.confirm_password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-[#00478F] focus:border-transparent transition-all outline-none text-slate-900 bg-slate-50 font-medium"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#00478F] hover:bg-[#003366] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#00478F] transition-all disabled:opacity-70 disabled:cursor-not-allowed uppercase tracking-wide"
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
