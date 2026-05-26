import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Car, Wallet, FileText, HelpCircle, LogOut } from 'lucide-react';

export default function Sidebar({ handleLogout }) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { name: 'My Vehicles', icon: Car, path: '/dashboard/vehicles' },
    { name: 'Recharge Wallet', icon: Wallet, path: '/dashboard/recharge' },
    { name: 'Statements', icon: FileText, path: '/transactions' },
    { name: 'Support', icon: HelpCircle, path: '/dashboard/support' },
  ];

  return (
    <div className="w-64 bg-[#003366] text-white flex flex-col h-screen sticky top-0 shadow-xl z-20 flex-shrink-0">
      {/* Branding */}
      <div className="p-6 border-b border-blue-800/50 flex flex-col space-y-4">
        {/* FASTag Logo (White background card) */}
        <div className="bg-white p-3 rounded-xl flex items-center justify-center shadow-sm">
          <img src="/Fastag_logo.png" alt="FASTag" className="h-8 object-contain" />
        </div>
        
        {/* GI Technology Logo */}
        <div className="bg-[#1a1a1a] px-4 py-2 rounded-xl flex items-center justify-center hover:bg-black transition-colors shadow-sm">
          <img src="/GI_Technology.png" alt="GI Technology" className="h-5 object-contain" />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPath === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center px-4 py-3 text-sm font-bold rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-[#00478F] text-white shadow-md' 
                  : 'text-blue-100 hover:bg-[#00478F]/50 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 mr-3 ${isActive ? 'text-[#f39c12]' : 'text-blue-300'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-blue-800/50">
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-3 text-sm font-bold text-blue-200 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Secure Logout
        </button>
      </div>
    </div>
  );
}
