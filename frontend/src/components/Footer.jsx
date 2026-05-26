import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src="/Fastag_logo.png" alt="FASTag" className="h-6 object-contain" />
            <div className="w-px h-4 bg-slate-200" />
            <img src="/GI_Technology.png" alt="GI Technology" className="h-5 object-contain" />
          </div>

          {/* Links */}
          <div className="flex items-center gap-5 text-xs font-medium text-slate-400">
            <Link to="#" className="hover:text-slate-700 transition-colors">Privacy Policy</Link>
            <Link to="#" className="hover:text-slate-700 transition-colors">Terms &amp; Conditions</Link>
            <Link to="#" className="hover:text-slate-700 transition-colors">Grievance</Link>
            <Link to="#" className="hover:text-slate-700 transition-colors">Contact</Link>
          </div>

          {/* Copyright */}
          <p className="text-xs text-slate-400 font-medium">
            © {new Date().getFullYear()} GI Technology
          </p>
        </div>
      </div>
    </footer>
  );
}
