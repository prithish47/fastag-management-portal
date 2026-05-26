import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  LayoutDashboard, Users, Car, FileText, Activity,
  Shield, LogOut, ChevronDown, Package, History, HelpCircle
} from 'lucide-react';

export default function AdminTopbar({ activeTab, onTabChange }) {
  const location = useLocation();
  const { adminUser, adminLogout } = useAdminAuth();

  const navItems = [
    { name: 'Dashboard', key: 'dashboard' },
    { name: 'Users',     key: 'users' },
    { name: 'Vehicles',  key: 'vehicles' },
    { name: 'Transactions', key: 'transactions' },
    { name: 'FASTag Warehouse', key: 'fastag' },
    { name: 'Audit Logs', key: 'audit' },
    { name: 'Support Queue', key: 'support' },
  ];

  const activeNav = navItems.find(n => n.key === activeTab) || navItems[0];

  const adminName = adminUser?.name || 'Administrator';
  const firstLetter = adminName.charAt(0).toUpperCase();

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-[64px] items-center">

          {/* Left — Breadcrumb */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admin Portal</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-800">{activeNav.name}</span>
          </div>

          {/* Right — profile */}
          <div className="flex items-center gap-4">
            <div className="w-px h-5 bg-slate-200" />

            <div className="flex items-center gap-2 group relative cursor-pointer">
              <div className="w-7 h-7 rounded-full bg-[#00478F] flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {firstLetter}
              </div>
              <div className="hidden sm:block leading-none">
                <p className="text-xs font-semibold text-slate-800">{adminName}</p>
                <p className="text-[10px] text-amber-600 mt-0.5 font-semibold">Administrator</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-50">
                <Link
                  to="/"
                  className="flex items-center w-full px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
                  User Portal
                </Link>
                <button
                  onClick={adminLogout}
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
