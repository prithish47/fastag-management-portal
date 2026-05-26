import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, FileText, Activity,
  Package, History, HelpCircle, Shield
} from 'lucide-react';

export default function AdminSidebar({ activeTab, onTabChange }) {
  const navItems = [
    { name: 'Dashboard', key: 'dashboard', icon: LayoutDashboard },
    { name: 'Users',     key: 'users',     icon: Users },
    { name: 'Vehicles',  key: 'vehicles',  icon: Car },
    { name: 'Transactions', key: 'transactions', icon: FileText },
    { name: 'FASTag Warehouse', key: 'fastag', icon: Package },
    { name: 'Audit Logs', key: 'audit', icon: History },
    { name: 'Support Queue', key: 'support', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 h-screen bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Logos & Branding */}
      <div className="h-[64px] flex items-center px-6 border-b border-slate-200 shrink-0">
        <Link to="/admin/dashboard" className="flex items-center gap-3">
          <img src="/Fastag_logo.png" alt="FASTag" className="h-7 object-contain" />
          <div className="w-px h-5 bg-slate-200" />
          <img src="/GI_Technology.png" alt="GI Technology" className="h-6 object-contain" />
        </Link>
      </div>

      {/* Admin Badge */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
          <Shield className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider leading-none mb-0.5">Admin Portal</p>
            <p className="text-xs text-amber-600 font-medium leading-none">Operations</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {navItems.map(item => {
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                active
                  ? 'font-bold text-[#00478F] bg-blue-50 shadow-sm border border-blue-100/50'
                  : 'font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00478F]' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}
      </nav>
      
      {/* Footer / Info (Optional) */}
      <div className="p-4 border-t border-slate-100 mt-auto shrink-0">
        <p className="text-[10px] text-center font-medium text-slate-400">
          © 2026 GI Technology
        </p>
      </div>
    </aside>
  );
}
