import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Wallet, FileText, HelpCircle, Bell, ChevronDown, LogOut, Check } from 'lucide-react';
import axios from 'axios';

export default function Topbar({ user = { name: 'Loading...' }, balance = '0.00', handleLogout, onRechargeClick }) {
  const location   = useLocation();
  const currentPath = location.pathname;
  
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      try {
        const res = await axios.get('http://127.0.0.1:8000/notifications/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchNotifications();
  }, [balance]); // Refresh when balance changes (like after recharge)

  // Click outside handler for notification dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`http://127.0.0.1:8000/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const navItems = [
    { name: 'Dashboard',   icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Vehicles', icon: Car,             path: '/vehicles' },
    { name: 'Recharge',    icon: Wallet,          path: '/dashboard/recharge' },
    { name: 'Statements',  icon: FileText,        path: '/transactions' },
    { name: 'Support',     icon: HelpCircle,      path: '/support' },
  ];

  const firstLetter = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-[64px] items-center">

          {/* Left — logos + nav */}
          <div className="flex items-center gap-6">

            {/* Logo group — matches Navbar exactly */}
            <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
              <img src="/Fastag_logo.png" alt="FASTag" className="h-8 object-contain" />
              <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              <img src="/GI_Technology.png" alt="GI Technology" className="h-7 object-contain hidden sm:block" />
            </Link>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 hidden lg:block" />

            {/* Nav links */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {navItems.map(item => {
                const active = currentPath === item.path;
                if (item.name === 'Recharge') {
                  return (
                    <button
                      key={item.name}
                      onClick={onRechargeClick}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0" />
                      {item.name}
                    </button>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
                      active
                        ? 'font-semibold text-[#00478F] bg-blue-50'
                        : 'font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right — balance / bell / profile */}
          <div className="flex items-center gap-4">

            {/* Balance */}
            <div className="hidden sm:flex flex-col items-end leading-none">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Balance</span>
              <span className="text-sm font-bold text-[#00478F] mt-0.5">₹{balance}</span>
            </div>

            <div className="w-px h-5 bg-slate-200" />

            {/* Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => setShowNotifMenu(!showNotifMenu)}
                className={`relative p-1.5 rounded-md transition-colors ${showNotifMenu ? 'bg-slate-100 text-[#00478F]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
              >
                <Bell className="w-4.5 h-4.5" />
                {notifications.some(n => !n.is_read) && (
                  <span className="absolute top-1 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </button>
              
              {showNotifMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-slate-500">No new notifications.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.notification_id} className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.is_read ? 'bg-blue-50/20' : ''}`}>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <p className={`text-xs font-bold ${!n.is_read ? 'text-slate-900' : 'text-slate-700'}`}>{n.title}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                              <p className="text-[9px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">{n.created_at}</p>
                            </div>
                            {!n.is_read && (
                              <button onClick={() => markAsRead(n.notification_id)} className="p-1 text-slate-300 hover:text-[#00478F] transition-colors" title="Mark as read">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-slate-200" />

            {/* Profile */}
            <div className="flex items-center gap-2 group relative cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-[#00478F] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {firstLetter}
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Account</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign out
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
