import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between h-[64px] items-center">

          {/* Logo group */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3">
              <img
                src="/Fastag_logo.png"
                alt="FASTag"
                className="h-8 object-contain"
              />
              <div className="w-px h-5 bg-slate-200 hidden sm:block" />
              <img
                src="/GI_Technology.png"
                alt="GI Technology"
                className="h-7 object-contain hidden sm:block"
              />
            </Link>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-3.5 py-2 text-sm font-medium text-slate-600 hover:text-[#00478F] hover:bg-slate-50 rounded-md transition-colors"
            >
              Home
            </Link>
            <Link
              to="/about"
              className="px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-[#00478F] hover:bg-slate-50 rounded-md transition-colors"
            >
              About FASTag
            </Link>
            <Link
              to="/guidelines"
              className="px-3.5 py-2 text-sm font-medium text-slate-500 hover:text-[#00478F] hover:bg-slate-50 rounded-md transition-colors"
            >
              Guidelines
            </Link>

            <div className="w-px h-5 bg-slate-200 mx-2" />

            <Link
              to="/"
              className="px-3.5 py-2 text-sm font-semibold text-[#00478F] hover:text-[#003a75] rounded-md transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="ml-1 px-4 py-2 bg-[#00478F] hover:bg-[#003a75] text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-lg">
          <div className="max-w-7xl mx-auto px-6 py-3 space-y-0.5">
            <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-700 hover:text-[#00478F] hover:bg-slate-50 rounded-md">Home</Link>
            <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-[#00478F] hover:bg-slate-50 rounded-md">About FASTag</Link>
            <Link to="/guidelines" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-[#00478F] hover:bg-slate-50 rounded-md">Guidelines</Link>
            <div className="pt-3 pb-2 border-t border-slate-100 mt-2 flex flex-col gap-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-center border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors">Login</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="text-center bg-[#00478F] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#003a75] transition-colors">Apply Now</Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
